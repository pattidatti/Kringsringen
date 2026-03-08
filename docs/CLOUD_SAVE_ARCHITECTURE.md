# Cloud Save Architecture - Kringsringen

## Oversikt

Kringsringen bruker Firebase Authentication + Firestore for cloud-basert synkronisering av karakterprofiler på tvers av enheter.

## Design-filosofi

### Offline-First
- **localStorage er alltid source of truth**
- Cloud sync er **additive** og **non-blocking**
- Spillet fungerer fullt ut uten internett-tilkobling

### Konflikthåndtering
- **"Last Write Wins" basert på timestamp**
- Hver profil har `lastPlayedAt` timestamp
- Ved konflikter: nyeste versjon overskriver

---

## Dataflyt

```
┌────────────────┐
│ LocalStorage   │ ← Source of Truth
│ ProfileStore   │
└────────┬───────┘
         │
         │ Auto-sync on:
         │ - Login
         │ - App blur/close
         │ - Profile update
         ↓
┌────────────────┐
│ CloudSave      │ → Firebase Auth → Firestore
│ Manager        │                   /users/{uid}/profiles/{id}
└────────────────┘
```

---

## Firestore Struktur

```
users/
  {userId}/
    profiles/
      {profileId}            → ParagonProfile
        id                   → string (UUID)
        name                 → string
        classId              → "krieger" | "archer" | "wizard" | "skald"
        paragonLevel         → number (0-10)
        currentGameLevel     → number (1-10)
        coins                → number
        upgradeLevels        → { [upgradeId]: level }
        unlockedWeapons      → string[]
        achievements         → string[]
        totalKills           → number
        lastPlayedAt         → number (timestamp)
        ...

    metadata/
      sync                   → { lastSyncedAt: number }
```

---

## Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Kun eieren kan lese/skrive sine egne profiler
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;

      match /profiles/{profileId} {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;
      }

      match /metadata/{docId} {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;
      }
    }
  }
}
```

**Sikkerhet:**
- Ingen kan lese andres profiler
- Kun autentiserte brukere kan aksessere sine egne data
- Ingen anonyme skrivinger

---

## CloudSaveManager API

### Metoder

#### `uploadProfiles(userId: string, profiles: ParagonProfile[])`
```typescript
// Laster opp alle profiler til Firestore
// Brukes: På login, etter app blur, manuell sync
await CloudSaveManager.uploadProfiles(user.uid, profiles);
```

#### `downloadProfiles(userId: string): Promise<ParagonProfile[]>`
```typescript
// Henter profiler fra Firestore
// Brukes: På login
const cloudProfiles = await CloudSaveManager.downloadProfiles(user.uid);
```

#### `syncOnLogin(userId: string, localProfiles: ParagonProfile[]): Promise<ParagonProfile[]>`
```typescript
// Merger lokale og cloud-profiler
// Strategi: Nyeste lastPlayedAt vinner
const merged = await CloudSaveManager.syncOnLogin(user.uid, localProfiles);
```

#### `queueSync(userId: string, profiles: ParagonProfile[])`
```typescript
// Debounced sync (max 1 write per 5 sekunder)
// Brukes: Etter hver profil-oppdatering
CloudSaveManager.queueSync(user.uid, profiles);
```

---

## Merge-logikk (Konfliktløsning)

```typescript
function mergeProfiles(local: ParagonProfile[], cloud: ParagonProfile[]): ParagonProfile[] {
  const merged = new Map<string, ParagonProfile>();

  // Kombiner begge lister
  [...local, ...cloud].forEach(profile => {
    const existing = merged.get(profile.id);

    // Hvis profil eksisterer: velg nyeste versjon
    if (!existing || profile.lastPlayedAt > existing.lastPlayedAt) {
      merged.set(profile.id, profile);
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}
```

**Eksempel-scenario:**

| Device | Profile ID | lastPlayedAt | Paragon Level | Coins |
|--------|-----------|--------------|---------------|-------|
| PC     | abc-123   | 1710000000   | 3             | 5000  |
| Mobile | abc-123   | 1710001000   | 2             | 3000  |

**Resultat:** Mobile-versjonen vinner (nyere timestamp), selv om PC har høyere stats.

---

## Auto-Sync Triggers

### 1. På Login
```typescript
// LoginModal.tsx
useEffect(() => {
  if (user && !authLoading) {
    const localStore = SaveManager.loadProfiles();
    const merged = await CloudSaveManager.syncOnLogin(user.uid, localStore.profiles);

    localStore.profiles = merged;
    SaveManager.saveProfiles(localStore);
  }
}, [user, authLoading]);
```

### 2. På App Blur (før device-bytte)
```typescript
// App.tsx
document.addEventListener('visibilitychange', () => {
  if (document.hidden && user && activeProfile) {
    const runProgress = SaveManager.loadRunProgress();
    const updated = SaveManager.syncToProfile(activeProfile, runProgress);
    SaveManager.updateProfile(updated);

    // Force upload (no debounce)
    const store = SaveManager.loadProfiles();
    CloudSaveManager.uploadProfiles(user.uid, store.profiles);
  }
});
```

### 3. Etter Profil-oppdatering
```typescript
// Når spiller ascender, kjøper oppgraderinger, etc.
SaveManager.updateProfile(updatedProfile);
if (user) {
  const store = SaveManager.loadProfiles();
  CloudSaveManager.queueSync(user.uid, store.profiles); // Debounced
}
```

---

## Offline-håndtering

### Scenario: Spiller uten nett
1. Spiller åpner spillet → ingen auth
2. Spiller oppretter karakter → lagres kun i localStorage
3. Spiller logger inn senere → lokal profil lastes opp til Firestore

### Scenario: Mistet tilkobling mid-game
1. Sync feiler silently
2. Endringer lagres i localStorage
3. Neste gang spillet går online → queued changes synkes

```typescript
// CloudSaveManager.ts
static async uploadProfiles(userId: string, profiles: ParagonProfile[]) {
  if (!navigator.onLine) {
    console.log('[CloudSaveManager] Offline - skipping upload');
    return; // Silent fail, retry on reconnect
  }

  try {
    await setDoc(/* ... */);
  } catch (error) {
    console.error('[CloudSaveManager] Upload failed:', error);
    // Don't throw - allow game to continue
  }
}
```

---

## Debouncing (Unngå Firestore quota-overforbruk)

```typescript
let syncQueue: Promise<void> = Promise.resolve();
let lastSyncTime = 0;
const SYNC_DEBOUNCE_MS = 5000; // Max 1 write per 5 seconds

static queueSync(userId: string, profiles: ParagonProfile[]) {
  const now = Date.now();

  if (now - lastSyncTime < SYNC_DEBOUNCE_MS) {
    console.log('[CloudSaveManager] Debouncing sync...');
    return;
  }

  lastSyncTime = now;

  // Chain syncs to avoid race conditions
  syncQueue = syncQueue
    .then(() => this.uploadProfiles(userId, profiles))
    .catch(err => console.error('[CloudSaveManager] Queued sync failed:', err));
}
```

**Fordeler:**
- Begrenser Firestore writes (viktig for gratis tier)
- Unngår race conditions (syncs kjører sekvensielt)
- Graceful failure (en feilet sync blokkerer ikke fremtidige syncs)

---

## Validering (Data Integrity)

```typescript
static validateProfile(data: any): boolean {
  if (!data || typeof data !== 'object') return false;

  // Sjekk required fields
  const requiredFields = [
    'id', 'name', 'classId', 'paragonLevel',
    'currentGameLevel', 'coins', 'createdAt', 'lastPlayedAt'
  ];

  for (const field of requiredFields) {
    if (!(field in data)) return false;
  }

  // Type checks
  if (typeof data.id !== 'string') return false;
  if (typeof data.paragonLevel !== 'number') return false;

  return true;
}
```

**Sikkerhet mot korrupte data:**
- Ugyldig Firestore-data hoppes over
- Logger warning i console
- Fortsetter med neste profil

---

## Testing

### Manual Test Plan

1. **Single-device test:**
   - Opprett karakter offline → sjekk localStorage
   - Logg inn → sjekk Firestore Console (profil skal vises)
   - Spill 10 minutter → sjekk at `lastPlayedAt` oppdateres

2. **Cross-device test:**
   - Device A: Opprett karakter "Krieger-P3"
   - Device A: Spill til level 5, coins = 1000
   - Device B: Logg inn → profil skal synkes
   - Device B: Spill til level 6, coins = 1500
   - Device A: Refresh → skal se level 6 + 1500 coins

3. **Conflict resolution test:**
   - Device A: Offline, spill til level 7 (coins = 2000)
   - Device B: Online, spill til level 6 (coins = 1800, nyere timestamp)
   - Device A: Går online → Device B sin versjon skal vinne

4. **Offline resilience test:**
   - Logg inn
   - Deaktiver nett mid-game
   - Spill 5 minutter
   - Reaktiver nett
   - Sjekk at endringer synkes

---

## Performance Considerations

### Firestore Quota (Spark Plan - Free Tier)
- **Reads:** 50,000/day
- **Writes:** 20,000/day
- **Storage:** 1 GB

**Med debouncing (5s):**
- 1 spiller × 1 time gameplay = ~720 potential syncs
- Med debouncing: ~12 actual writes (1 per 5 min)
- **Safe for ~1600 spillere/dag**

### Bandwidth
- Gjennomsnittlig profil: ~2 KB JSON
- 1000 syncs = 2 MB Firestore writes
- **Neglisjerbar kostnad**

---

## Fremtidige Forbedringer (Optional)

1. **Delta sync** — Kun sync endrede felter (reduserer Firestore writes med 80%)
2. **Offline queue** — Lagre failed syncs i IndexedDB, retry ved reconnect
3. **Conflict dialog** — UI for å velge mellom local/cloud ved store konflikter
4. **Backup export** — JSON export av alle profiler (for manuell backup)
5. **Firestore Realtime Listeners** — Live sync mellom åpne tabs (requires websocket)

---

## Feilsøking

### "Kunne ikke lagre til skyen"
- Sjekk internett-tilkobling
- Sjekk Firebase console → Authentication (er brukeren logged in?)
- Sjekk Firestore Rules → Test i Rules Playground

### "Profil ikke funnet etter login"
- Sjekk `lastPlayedAt` timestamps i Firestore
- Sjekk localStorage → `kringsringen_profiles_v1`
- Åpne DevTools Console → søk etter "[CloudSaveManager]"

### "Profil overskrives med gammel versjon"
- Konflikt: lokal profil har eldre timestamp
- Løsning: Force sync fra nyeste device

---

## Konklusjon

Cloud save systemet i Kringsringen er designet for **robusthet** og **brukervennlighet**:
- ✅ Offline-first (spillet fungerer uten nett)
- ✅ Transparent syncing (ingen loading screens)
- ✅ Konfliktløsning (latest timestamp wins)
- ✅ Kostnadseffektiv (debouncing + validering)

Ved spørsmål, se `src/services/CloudSaveManager.ts` eller `src/contexts/AuthContext.tsx`.
