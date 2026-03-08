# Paragon Expansion System — Design Document
**Branch:** `claude/game-progression-expansion-RwJ55`
**Sist oppdatert:** 2026-03-07

Dette dokumentet er den autoritative designspesifikasjonen for Paragon-systemet.
Det dekker alle 6 faser og brukes til å verifisere at implementasjonen samsvarer med intensjonen.

---

## Fase 0: Intensjon & Formål ("No Code Without Intent")

### Problemet dette løser
Kringsringen hadde ingen postgame-loop. Spillere som slo Level 10 hadde ingenting å strekke seg mot — ingen varig progressjon, ingen gjenspillsverdi.

### Løsningen
Et **Diablo-inspirert Paragon-system** som gir varig, tverrøkts progresjon:
- Persistente karakterprofiler (opp til 6) som overlever mellom sesjoner
- Skalerende vanskelighetsgrad per Paragon-tier (eksponentiell)
- Klasse-spesifikke evner låst opp ved P2, P4, P6
- Level farming med myntkompensasjon

### Hva dette IKKE er
- Ikke et roguelite-system (oppgraderinger beholdes etter død)
- Ikke permanente statistikkbonuser utenom mynt/upgrades
- Ikke en ny karakter-klasse — Paragon er et lag oppå eksisterende klasser

---

## Fase 1: Dataarkitektur

### Kjernedatastruktur: `ParagonProfile`
**Fil:** `src/config/paragon.ts`

```typescript
interface ParagonProfile {
  id: string;                    // UUID
  name: string;                  // Spillernavn
  classId: string;               // 'warrior' | 'archer' | 'wizard' | 'skald'
  paragonLevel: number;          // 0 = Normal, 1-10 = Paragon I-X
  currentGameLevel: number;      // Nåværende level (1-10)
  clearedLevels: number[];       // Tidligere fullførte levels (for level-select)
  coins: number;                 // Permanent valuta (beholdes ved death)
  upgradeLevels: Record<string, number>;  // Alle upgrades (persistent)
  unlockedWeapons: string[];     // Ulåste våpen (persistent)
  currentWeapon: string;         // Aktivt våpen
  totalKills: number;            // Livsstatistikk
  totalDeaths: number;           // Livsstatistikk
  totalPlaytimeMs: number;       // Livsstatistikk
  lastPlayedAt: number;          // Timestamp (for sortering i CharacterSelect)
  achievementIds: string[];      // Fase 6: Achievements
  createdAt: number;             // Timestamp
  // Mid-session restore fields
  savedHP?: number;
  savedWave?: number;
  savedX?: number;
  savedY?: number;
}
```

### Vanskelighetskalering: `PARAGON_SCALING`
**Fil:** `src/config/paragon.ts`
Alle multiplikatorer er **eksponentielle** og compoundes per Paragon-level: `base^paragonLevel`

| Parameter | Base | Formel (ved P3) |
|-----------|------|-----------------|
| Enemy HP | 1.4 | 1.4^3 = 2.74× |
| Enemy skade | 1.25 | 1.25^3 = 1.95× |
| Enemy fart | 1.05 | 1.05^3 = 1.16× |
| Enemy antall | 1.15 | 1.15^3 = 1.52× |
| Boss HP | 1.5 | 1.5^3 = 3.38× |
| Coin drop | 1.3 | 1.3^3 = 2.20× (kompensasjon) |

### Death Penalty: `DEATH_PENALTY`
- `coinLossFraction`: 0.10 (10% tap)
- `coinFloor`: 0 (kan ikke gå under 0)
- **Ingen permadeath.** Alle oppgraderinger, våpen og nivåer beholdes.

### Konstanter
- `MAX_CHARACTER_SLOTS = 6`
- `FARM_COIN_MULTIPLIER = 0.5` — halverte coins når man replayer et allerede cleared level
- `PARAGON_TIER_NAMES: Record<number, string>` — 0="Normal", 1="Paragon I", …, 10="Paragon X"

### Dataflyt
```
App.tsx (React state: activeProfile, targetLevel)
  → CharacterSelectScreen → velg/opprett profil
  → LevelSelectScreen → velg level
  → GameContainer
      → Phaser registry (paragonLevel, clearedLevels, etc.)
      → WaveManager leser registry → scaler fiender
      → ParagonAbilityManager leser registry → aktiver evner
  → SaveManager.syncToProfile() → persist etter hvert save event
  → VictoryOverlay → onAscend() → paragonLevel++, reset currentGameLevel=1
```

### Storage
**Nøkkel:** `kringsringen_profiles_v1`
**Format:** `ProfileStore { activeProfileId, profiles: ParagonProfile[] }`
**Legacy key:** `kringsringen_save_v1` (støttes fremdeles for bakoverkompatibilitet og multiplayer)

### Registry-kontrakt (Phaser ↔ React)
Disse nøklene må alltid holdes synkronisert:

| Registry Key | Type | Satt av | Lest av |
|---|---|---|---|
| `paragonLevel` | `number` | GameContainer, MainScene | WaveManager, ParagonAbilityManager, Hotbar, TopHUD |
| `paragonAbilityCooldown_E` | `{ duration, timestamp } \| null` | ParagonAbilityManager | Hotbar |
| `paragonAbilityCooldown_F` | `{ duration, timestamp } \| null` | ParagonAbilityManager | Hotbar |
| `paragonAbilityCooldown_Q` | `{ duration, timestamp } \| null` | ParagonAbilityManager | Hotbar |
| `clearedLevels` | `number[]` | GameContainer | LevelSelectScreen (via App), WaveManager |
| `activeProfileId` | `string` | GameContainer | SaveManager (for syncToProfile) |

---

## Fase 2: Resiliens & Feilhåndtering

### Edge Cases som er håndtert
- **Legacy save-migrering:** `SaveManager.migrateFromLegacy()` konverterer gamle saves til første Paragon-profil
- **Soft death:** Coins kan aldri gå under `DEATH_PENALTY.coinFloor` (0)
- **Restore etter death:** `savedHP`, `savedWave`, `savedX`, `savedY` i profilen

### Edge Cases som MÅ håndteres
- **Feil type-streng i getParagonMultiplier():** Returnerer 1.0 (no-op) — WaveManager må alltid bruke riktig type-streng.
- **Ascend-flow atomisitet:** `VictoryOverlay.onAscend()` → `GameContainer` → `App.tsx` må oppdatere `paragonLevel`, resette `currentGameLevel=1`, og bevare alle andre felter i ett SaveManager-kall.
- **6-slots fullt:** `CharacterSelectScreen` viser "Fullt" og deaktiverer "Ny karakter"-knappen.
- **P0 (Normal) karakter:** `paragonLevel=0` → ingen Paragon-evner, ingen Paragon-tab i butikken. Hotbar skjuler E/F/Q-slots.

---

## Fase 3: UX-intensjon

### Skjermflyt
```
LandingPage
  ↓ onPlay()
CharacterSelectScreen
  ↓ onSelectProfile() | onNewCharacter()
  ↓                       ↓
LevelSelectScreen      ClassSelector (eksisterende)
  ↓ onSelectLevel()       ↓ onClassSelected()
  ↗————————————————————————
GameContainer (+ FantasyBook overlay)
  ↓ onVictory()
VictoryOverlay
  ↓ onAscend() | onReturnToMenu()
  ↗ CharacterSelectScreen
```

### UI-design per komponent

**CharacterSelectScreen**
- Karakterkort med: portrett, navn, Paragon-tier, stats (level, coins, drap), sist spilt
- "Ny karakter"-slot viser "+" eller "Fullt" (6/6)
- Delete-bekreftelse overlay
- Sortert: sist spilt øverst
- Animert med Framer Motion

**LevelSelectScreen**
- Nivåkort: nummer, navn, bølgeantall, fiende-antall, boss-info
- Status-badges: KLART / NESTE / farming-indikator
- Låste nivåer grayed out
- "Fortsett Level X" hurtigknapp
- Farming-indikator viser "50% coins" visuelt

**VictoryOverlay**
- Mid-game (level < 10): "Level X Fullfort!" + coins + "Fortsett"-knapp
- Final (level 10): Full ascension-skjerm med crown, tier-display, stats-grid, animerte lyseffekter

**Hotbar**
- E/F/Q-slots: kun synlig når `paragonLevel > 0`
- Radial cooldown-overlay per slot
- Gull-ramme + obsidian-panel for Paragon-slots
- Hotkey-badge (E/F/Q) i hjørne

**TopHUD**
- Paragon-badge: gull gradient, tier-navn, vises kun ved `paragonLevel > 0`
- Posisjonert `-top-1 -right-2` relativt til level-display

**FantasyBook**
- Ny "PARAGON"-fane synlig kun når `paragonLevel > 0`
- Paragon-oppgraderinger filtrert: vises kun hvis `paragonLevel >= upgrade.paragonRequired`
- Låste oppgraderinger vises med lås-ikon og "Krever Paragon X"

**GameOverOverlay**
- Paragon-death: "Beseiret" (ikke "Falnet"), viser coin penalty, "Prøv Level Igjen" og "Tilbake til Meny"
- Klassisk death (ikke-Paragon): eksisterende flow bevart

---

## Fase 4: Implementerte systemer (Fase 1–4)

### Fase 1: Core Paragon System
**Commit:** `0641fef`

**Filer opprettet:**
- `src/config/paragon.ts` — all data og konstanter

**Filer modifisert:**
- `src/game/SaveManager.ts` — ProfileStore API (loadProfiles, saveProfiles, getActiveProfile, setActiveProfile, createProfile, updateProfile, deleteProfile, hasProfiles, profileToRunProgress, syncToProfile, migrateFromLegacy)
- `src/game/WaveManager.ts` — startLevel(level, startAtWave), getParagonLevel(), isFarmingLevel(), Paragon-skalering i startWave()
- `src/App.tsx` — ny AppScreen enum, activeProfile/targetLevel state, handlePlay/handleSelectProfile/handleNewCharacter/handleClassSelected/handleSelectLevel/handleExitToMenu
- `src/components/GameContainer.tsx` — activeProfile/targetLevel props, registry-injeksjon, showVictory state, level-complete event handler

### Fase 2: Character Select & Profile System
**Commit:** `0641fef` (samme)

**Filer opprettet:**
- `src/components/ui/CharacterSelectScreen.tsx` — CharacterCard, NewCharacterSlot, delete-overlay, Framer Motion

### Fase 3: Level Select & Farming
**Commit:** `0641fef` (samme)

**Filer opprettet:**
- `src/components/ui/LevelSelectScreen.tsx` — LevelCard, farming-indikator, lock-logikk
- `src/components/ui/VictoryOverlay.tsx` — mid-game og final ascension-variant

**Filer modifisert:**
- `src/components/ui/GameOverOverlay.tsx` — Paragon soft death branch (isParagonDeath, coinPenalty, "Beseiret"-screen)
- `src/components/LandingPage.tsx` — onPlay prop for ny Paragon-flow

### Fase 4: Paragon Unlocks & New Abilities
**Commit:** `0a4d5e8`

**Filer opprettet:**
- `src/config/paragon-abilities.ts` — 12 evner, ParagonAbilityDef interface, helper functions
- `src/config/paragon-upgrades.ts` — 11 passive Paragon-oppgraderinger, ParagonUpgradeConfig interface
- `src/game/ParagonAbilityManager.ts` — attemptSlot(), update(), alle 12 do*() metoder

**Filer modifisert:**
- `src/game/InputManager.ts` — E/F/Q hotkeys, delegering til paragonAbility.attemptSlot()
- `src/game/main.ts` — `this.paragonAbility = new ParagonAbilityManager(this)` (linje ~208), `paragonAbility.update()` i update loop (linje ~380)
- `src/game/IMainScene.ts` — `paragonAbility: ParagonAbilityManager` felt
- `src/components/ui/FantasyBook.tsx` — Paragon-tab, filtrering via paragonRequired
- `src/components/ui/Hotbar.tsx` — E/F/Q evne-slots, RadialCooldown overlay
- `src/components/ui/TopHUD.tsx` — Paragon-badge med getParagonTierName()

---

## Paragon Abilities — Full Spesifikasjon

**Fil:** `src/config/paragon-abilities.ts`
**Manager:** `src/game/ParagonAbilityManager.ts`

### ParagonAbilityDef Interface
```typescript
interface ParagonAbilityDef {
  id: string;
  name: string;
  description: string;
  icon: string;            // Sprite frame name
  hotkey: 'E' | 'F' | 'Q';
  classId: string;
  paragonRequired: number; // Min Paragon level (2, 4, eller 6)
  cooldown: number;        // Sekunder
  duration?: number;       // For buffs/kanalisering
}
```

### Evner per klasse

**Krieger** (`classId: 'warrior'`)
| Slot | Navn | Krav | Cooldown | Beskrivelse |
|------|------|------|----------|-------------|
| E | Jordskjelv-Slag | P2 | 12s | AoE mark-slag rundt spiller, 3× baseskade, bedøver fiender |
| F | Blodrus | P4 | 25s | 10s buff: +50% skade, +30% fart, men tar 20% mer skade |
| Q | Titanens Skjold | P6 | 45s | 5s uovervinnelighetsbarriere som reflekterer prosjektiler |

**Archer** (`classId: 'archer'`)
| Slot | Navn | Krav | Cooldown | Beskrivelse |
|------|------|------|----------|-------------|
| E | Pilregn | P2 | 15s | 3s kanalisert pilregn over et AoE-område |
| F | Skyggesteg | P4 | 20s | Teleport bak nærmeste fiende + garantert kritisk treff |
| Q | Føniks-Pil | P6 | 40s | 5× baseskade ildpil-eksplosjon + brennende bakke |

**Wizard** (`classId: 'wizard'`)
| Slot | Navn | Krav | Cooldown | Beskrivelse |
|------|------|------|----------|-------------|
| E | Meteorregn | P2 | 15s | 3s kanalisert meteorregn over et AoE-område |
| F | Tidsvarp | P4 | 30s | 80% slow på alle fiender i radius i 4s |
| Q | Arkan Nova | P6 | 50s | 6× baseskade eksplosjon, skalerer med element-upgrades |

**Skald** (`classId: 'skald'`)
| Slot | Navn | Krav | Cooldown | Beskrivelse |
|------|------|------|----------|-------------|
| E | Krigshymne | P2 | 18s | +25% skadebuff til spiller i 8s |
| F | Dissonans | P4 | 22s | Fiender i radius tar +40% skade i 5s (debuff) |
| Q | Ragnarök-Vers | P6 | 60s | Aktiverer alle 4 Vers simultant i 10s |

---

## Paragon Upgrades — Full Spesifikasjon

**Fil:** `src/config/paragon-upgrades.ts`
Vises i `FantasyBook` under "PARAGON"-fanen.

| Navn | Paragon krav | Effekt | Prisingbase | Prisingscaling |
|------|-------------|--------|-------------|----------------|
| Udødelig Vitalitet | P1 | +50 Max HP per nivå | 2000 | 2.0 |
| Eldgammel Styrke | P1 | +8% all skade per nivå | 2500 | 2.0 |
| Vindens Velsignelse | P1 | +5% fart per nivå | 1800 | 1.9 |
| Kritisk Mestring | P2 | +15% kritisk skade per nivå | 3000 | 2.1 |
| Blodtørst | P2 | +3 HP per drap per nivå | 2800 | 2.0 |
| Torneskjold | P2 | +5% reflektert skade per nivå | 3200 | 2.1 |
| Elementær Overlegenhet | P3 | +10% element-skade per nivå | 4000 | 2.2 |
| Dragens Skatt | P3 | +10% coins per nivå | 3500 | 2.1 |
| Tidsmanipulering | P4 | -4% cooldown per nivå | 5000 | 2.3 |
| Andre Vind | P4 | +5% sjanse å overleve killing blow per nivå | 6000 | 2.4 |
| Maktens Aura | P5 | Kontinuerlig AoE skade rundt spiller | 8000 | 2.5 |
| Bøddelen | P5 | Instant-drap under HP-terskel (skaler m/nivå) | 8000 | 2.5 |

---

## Fase 5: Firebase Auth & Cloud Save (PLANLAGT — IKKE IMPLEMENTERT)

### Intensjon
Spillere skal kunne logge inn med Google og få profilene sine synkronisert til Firestore. Designprinsipp: **offline-først** — localStorage er alltid source of truth. Cloud sync er additivt.

### Komponenter som skal lages

**`src/services/AuthProvider.tsx`**
- Firebase Auth context-provider
- Google sign-in / sign-out
- `useAuth()` hook returnerer `{ user, signIn, signOut, loading }`
- Wraps hele app i `App.tsx`

**`src/components/ui/LoginModal.tsx`**
- Vises fra Settings eller Landing Page
- Google sign-in knapp
- Vis innlogget bruker (navn, avatar)
- Vis sync-status: "Synkronisert", "Synkroniserer...", "Ikke synkronisert"

**`src/services/CloudSaveManager.ts`**
- `uploadProfiles(userId, profiles)` — skriv til Firestore
- `downloadProfiles(userId)` — hent fra Firestore
- `syncOnLogin(userId)` — automatisk sync ved innlogging
- **Konflikt-strategi:** Siste `lastPlayedAt` timestamp vinner per profil

**Firestore-struktur:**
```
users/{userId}/profiles/{profileId}: ParagonProfile
```

### Dataflyt
1. Bruker logger inn med Google → `AuthProvider` setter `user`
2. `CloudSaveManager.syncOnLogin()` kjøres automatisk
3. Sammenlign cloud profiles med localStorage profiles
4. Merge: behold profil med høyest `lastPlayedAt` per `id`
5. Skriv merged resultat til både localStorage og Firestore

### Edge Cases
- **Offline-spilling:** Alt lagres lokalt, sync neste gang bruker er online
- **Ny enhet:** Download cloud profiles, merge med (tomme) lokale profiles
- **Konflikt:** Streng-regel — siste timestamp vinner, ingen manuell merge

---

## Fase 6: Achievements (PLANLAGT — IKKE IMPLEMENTERT)

### Intensjon
30+ achievements for å belønne spillestil, progresjon og mestring. Vises som toast-notifikasjon ved unlock, kan browsed i en achievement-liste.

### Komponenter som skal lages

**`src/config/achievements.ts`**
```typescript
interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'combat' | 'survival' | 'paragon' | 'exploration';
  secret?: boolean;  // Skjult inntil unlocked
}
```

**`src/game/AchievementManager.ts`**
- Lytter til Phaser events (kills, deaths, level-complete, etc.)
- Sjekker betingelser og kaller `unlockAchievement(id)`
- Lagrer unlocked achievements i `activeProfile.achievementIds`

**`src/components/ui/AchievementPopup.tsx`**
- Toast-notifikasjon: ikon, navn, beskrivelse
- Animert inn fra høyre, forsvinner etter 4s
- Framer Motion

**`src/components/ui/AchievementList.tsx`**
- Browsable grid av alle achievements
- Låste vises grayed/silhouette
- Filter per kategori

### Achievement-katalog

**Combat Mastery**
| ID | Navn | Beskrivelse |
|----|------|-------------|
| `pristine_boss` | Uberørt | Beseiret en boss uten å ta skade |
| `sword_dance` | Sverddansen | 20 kills på 10 sekunder |
| `executioner` | Bøddelen | Brukt Paragon-oppgradering "Bøddelen" til å drepe fiende |
| `perfect_wave` | Perfekt Bølge | Fullførte en bølge uten å ta skade |

**Survival**
| ID | Navn | Beskrivelse |
|----|------|-------------|
| `last_stand` | Siste Mann | Overlevde 30 sekunder med under 5% HP |
| `speedrun` | Speedrun | Fullførte Level 10 på under 3 minutter |
| `untouched_level` | Uberørt Nivå | Fullførte et helt nivå uten å dø |
| `coin_hoarder` | Gullsmed | Akkumulerte 50 000 coins på én karakter |

**Paragon Progression**
| ID | Navn | Beskrivelse |
|----|------|-------------|
| `first_ascension` | Første Oppstigelse | Nådde Paragon I |
| `paragon_5` | Veteran | Nådde Paragon V |
| `paragon_10` | Legende | Nådde Paragon X |
| `ability_first` | Mester i Krig | Brukte første Paragon-evne |
| `ragnarok` | Ragnarök | Aktiverte Ragnarök-Vers som Skald |

**Exploration**
| ID | Navn | Beskrivelse |
|----|------|-------------|
| `collector` | Samler | Kjøpte max nivå på alle vanlige oppgraderinger |
| `all_classes` | Mester av Alle | Nådde Paragon III med alle 4 klasser |
| `all_weapons` | Arsenalet | Låste opp alle våpen på én karakter |
| `all_paragon_upgrades` | Paragon-Mester | Kjøpte alle Paragon-oppgraderinger |

---

## Pre-Mortem: Potensielle Feilpunkter

**1. Ascend-flow atomisitet**
- *Risiko:* `paragonLevel++` og `currentGameLevel=1` skjer ikke atomisk. Crash mellom disse gir P1 + level 10 (umulig vanskelighetsgrad).
- *Mitigasjon:* `VictoryOverlay.onAscend()` skal kalle `SaveManager.updateProfile()` med komplett ny profil i ett kall.

**2. Paragon-skalering vs. balanse**
- *Risiko:* P3 fiender har 2.74× HP og 1.95× skade.
- *Akseptert:* Designintensjon er at Paragon er utfordrende. Coins skalerer 2.20× som kompensasjon.

**3. SaveManager dobbel-skriving**
- *Risiko:* Både legacy `kringsringen_save_v1` og ny `kringsringen_profiles_v1` oppdateres. Kan divergere.
- *Mitigasjon:* `profileToRunProgress()` og `syncToProfile()` er bridging-funksjoner.

**4. E-key konflikt (klasse-evne vs. Paragon-evne)**
- *Design:* E: Paragon-evne tar prioritet hvis tilgjengelig (ulåst + ikke på cooldown). Ellers faller E tilbake til klasse-evne via `attempt-class-ability-e` event.
- *Ref:* `InputManager.ts` linje 320–359.

---

## Verifikasjonskontrolliste

### Fase 1–4 (Implementert)
- [ ] CharacterSelectScreen viser maks 6 slots, sortert sist spilt
- [ ] LevelSelectScreen viser riktig status (KLART/NESTE/låst) og 50% farming-indikator
- [ ] VictoryOverlay: mid-game viser "Fortsett", final viser Ascend-dialog
- [ ] GameOverOverlay: Paragon-death viser "Beseiret" med coin penalty, ikke "Falnet"
- [ ] Hotbar: E/F/Q-slots skjult ved paragonLevel=0, synlig ellers
- [ ] TopHUD: Paragon-badge synlig ved paragonLevel>0
- [ ] FantasyBook: Paragon-fane synlig ved paragonLevel>0, oppgraderinger filtrert
- [ ] E-key fallback til klasse-evne fungerer korrekt
- [ ] Paragon-skalering aktiv i WaveManager (fiender skalerer per tier)
- [ ] Ascend-flow: paragonLevel++, currentGameLevel=1, coins/upgrades bevart
- [ ] Legacy migration: gammel save konverteres til første profil
- [ ] Death penalty: coins kan ikke gå under 0

### Fase 5–6 (Ikke implementert — neste steg)
- [ ] Firebase Auth integrert i App.tsx
- [ ] Profiles synkroniserer til Firestore ved innlogging
- [ ] Merge-strategi: siste timestamp vinner
- [ ] Achievement events trigges korrekt
- [ ] Achievement popup vises ved unlock
- [ ] Achievements persistes i ParagonProfile.achievementIds
