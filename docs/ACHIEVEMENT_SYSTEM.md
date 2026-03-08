# Achievement System - Kringsringen

## Oversikt

Kringsringen har et comprehensive achievement-system som sporer spillerprestasjoner på tvers av gameplay-kategorier.

---

## Achievement Kategorier

### 1. **Combat** (Kamp)
Drepe fiender, bosser, og overlevelse:
- Kill-baserte achievements ("First Blood", "Slayer", "Massacre")
- Boss-relaterte ("Boss Slayer", "Dragon Slayer")
- Klasse-spesifikke ("Sword Master", "Archmage")

### 2. **Progression** (Progresjon)
Nivå- og Paragon-milepæler:
- Level completion ("Halfway There", "Champion")
- Paragon ascensions ("Ascended", "Paragon Master")
- Wave milestones ("Wave Warrior")

### 3. **Economy** (Økonomi)
Gull-samling og shopping:
- Coin collection ("Penny Pincher", "Wealthy")
- Upgrade purchases ("Shopaholic")

### 4. **Exploration** (Utforskning)
Level-spesifikke prestasjoner:
- Level-clear achievements
- Secret discoveries (fremtidig)

### 5. **Skill** (Dyktighet)
Utfordrende prestasjoner:
- No-damage runs ("Untouchable")
- Speed clears ("Speedrunner")
- Efficiency challenges ("Perfectionist")

---

## Achievement Definisjoner

### Interface

```typescript
interface AchievementDef {
  id: string;                        // Unik ID
  name: string;                      // Visningsnavn
  description: string;               // Beskrivelse
  category: AchievementCategory;     // combat | progression | economy | exploration | skill
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;                      // Emoji icon
  condition: (stats: AchievementStats) => boolean;  // Unlock-betingelse
  progress?: (stats: AchievementStats) => { current: number; max: number }; // Progress tracking
}
```

### Eksempel

```typescript
{
  id: 'first_blood',
  name: 'First Blood',
  description: 'Kill your first enemy',
  category: 'combat',
  rarity: 'common',
  icon: '⚔️',
  condition: (stats) => stats.totalKills >= 1,
}
```

---

## AchievementManager

### Responsibility
- Lytter til game events (`enemy-killed`, `wave-complete`, etc.)
- Evaluerer achievement conditions
- Oppdaterer `ParagonProfile.achievements[]`
- Emitter `achievement-unlocked` events til UI

### API

```typescript
class AchievementManager {
  constructor(scene: IMainScene);

  // Event handlers (automatically bound)
  private onEnemyKilled(data: { enemyType: string; isBoss: boolean }): void;
  private onWaveComplete(data: { wave: number; level: number }): void;
  private onLevelComplete(): void;
  private onPlayerHit(data: { damage: number }): void;
  private onPlayerDeath(): void;
  private onBossDefeated(): void;

  // Manual trigger
  public checkAchievements(): void;
}
```

### Game Event Wiring

| Event | Emitted By | Data |
|-------|-----------|------|
| `enemy-killed` | Enemy.ts | `{ enemyType, isBoss }` |
| `wave-complete` | WaveManager.ts | `{ wave, level }` |
| `level-complete` | WaveManager.ts | `{}` |
| `player-hit` | PlayerCombatManager.ts | `{ damage }` |
| `player-death` | PlayerCombatManager.ts | `{}` |
| `boss-defeated` | BossEnemy.ts | `{}` |

---

## Achievement Stats Tracking

```typescript
interface AchievementStats {
  totalKills: number;
  bossKills: number;
  wavesClaimed: number;
  levelsCleared: number;
  totalDeaths: number;
  coinsEarned: number;
  upgradesPurchased: number;
  highestLevelReached: number;
  paragonLevel: number;
  damageTaken: number;
  timePlayed: number; // Seconds
  currentStreak: number; // Waves without death
}
```

**Data-kilde:**
- Lastes fra `ParagonProfile` (persistent stats)
- Oppdateres real-time under gameplay
- Lagres tilbake til profil ved level-complete/death

---

## Hvordan Legge Til Nye Achievements

### Steg 1: Definer achievement i `src/config/achievements.ts`

```typescript
export const ACHIEVEMENTS: AchievementDef[] = [
  // ... existing achievements ...

  // NEW: Speed-clear achievement
  {
    id: 'speedrunner',
    name: 'Speedrunner',
    description: 'Complete Level 1 in under 5 minutes',
    category: 'skill',
    rarity: 'epic',
    icon: '⚡',
    condition: (stats) => {
      // Custom logic (requires tracking level clear time)
      const level1Time = stats.levelTimes?.[1] || Infinity;
      return level1Time < 300; // 5 minutes = 300 seconds
    },
    progress: (stats) => {
      const level1Time = stats.levelTimes?.[1] || 0;
      return {
        current: Math.max(0, 300 - level1Time),
        max: 300,
      };
    },
  },
];
```

### Steg 2: Utvid `AchievementStats` interface (hvis nødvendig)

```typescript
// src/game/AchievementManager.ts
interface AchievementStats {
  // ... existing fields ...

  // NEW: Track level clear times
  levelTimes?: Record<number, number>; // { levelNum: seconds }
}
```

### Steg 3: Implementer stat-tracking logikk

```typescript
// src/game/WaveManager.ts
private onLevelComplete() {
  const levelNum = this.scene.registry.get('gameLevel');
  const startTime = this.scene.data.get('levelStartTime') || Date.now();
  const elapsedSeconds = (Date.now() - startTime) / 1000;

  // Emit event with timing data
  this.scene.events.emit('level-complete', {
    level: levelNum,
    timeSeconds: elapsedSeconds,
  });
}
```

### Steg 4: Oppdater AchievementManager event handler

```typescript
// src/game/AchievementManager.ts
private onLevelComplete(data: { level: number; timeSeconds: number }) {
  const profile = SaveManager.getActiveProfile();
  if (!profile) return;

  // Track level clear time
  if (!profile.levelTimes) profile.levelTimes = {};
  profile.levelTimes[data.level] = data.timeSeconds;

  // Update stats and check achievements
  this.checkAchievements();
}
```

### Steg 5: Test achievement

```bash
npm run dev
```

1. Spill Level 1
2. Complete under 5 minutter
3. Sjekk at toast vises + achievement lagres i profil

---

## Achievement UI

### UI Design Principles

**"Tavern Notice Board" aesthetic** - Kompakt, parchment-based design som matcher spillets fantasy-tema.

**Design-beslutninger:**
- **Unified Fantasy Theme:** Alle komponenter bruker `FantasyButton` og parchment-farger
- **Compact Horizontal Layout:** Achievements vises som badges (icon | title | description | status)
- **High Information Density:** 15-18 achievements synlige samtidig (vs. 6 med gammel design)
- **Visible Scrollbar:** Custom amber-gradient scrollbar med sepia track

### AchievementPopup (Toast)

```typescript
// src/components/ui/AchievementPopup.tsx
<AchievementToastQueue
  queue={achievementQueue}
  onDismiss={(id) => setAchievementQueue(prev => prev.filter(item => item.id !== id))}
/>
```

**Features:**
- Auto-dismiss etter 4 sekunder
- Queue system (max 2 toasts samtidig)
- Stagger delay (500ms mellom toasts)
- Rarity-based glow effect
- Achievement unlock sound (`achievement_unlock` SFX)

### AchievementBookOverlay (Dobbelside Layout i FantasyBook)

```typescript
// src/components/ui/FantasyBook.tsx → Achievements tab
<AchievementBookOverlay />
```

**Design:**
- **Dobbelside-layout:** Achievement-innholdet rendres som en autentisk dobbelside i boken (`col-span-2`)
- **Parchment overlay:** Subtil bakgrunn (`rgba(227, 218, 201, 0.3)`) som matcher bok-estetikken
- **Visible scrollbar:** Synlig `custom-scrollbar` (amber gradient) for tydelig scroll-feedback
- **Responsive:** Arver bok-dimensjoner via CSS variables (`--book-width`)

**Innhold (via AchievementGrid):**
- **Single-column compact layout** (grid-cols-1)
- **Fantasy-styled filter buttons** (FantasyButton components)
- **Horizontal badge design:**
  - 32×32px icon (left)
  - Title + description (center, flex-1)
  - Status indicator: ✓ (unlocked) | ○ (locked)
- **Category filtering:** ALLE | KAMP | OVERLEVELSE | PARAGON | UITFORSKNING
- **Stats display:** "X / Y" unlocked counter

### AchievementCard - Compact Mode

**Layout structure:**
```
┌──────────────────────────────────────────────────────────────┐
│ 🎯 Achievement Title     │ Description text here...     │ ✓  │
└──────────────────────────────────────────────────────────────┘
```

**Visual styling:**
- **Unlocked:** `bg-[#e3dac9]/40` (parchment) + `border-amber-600/40`
- **Locked:** `bg-slate-200/40` (gray) + `border-slate-400/30` + grayscale filter
- **Secret:** Icon shows 🔒, text shows "???"
- **Hover:** Subtle scale (1.01) + horizontal shift (x: 2px)

**Props:**
```typescript
interface AchievementCardProps {
  achievement: AchievementDef;
  unlocked: boolean;
  unlockedAt?: number;
  compact?: boolean; // NEW: Toggle compact horizontal layout
}
```

### Custom Scrollbar

**CSS implementation** (src/index.css):
```css
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #d97706 0%, #92400e 100%);
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
```

**Design details:**
- Width: 10px
- Thumb: Amber gradient with subtle shadow
- Track: Sepia background with border
- Hover: Brightens to `#f59e0b → #b45309`

---

## Progress Tracking (Incremental Achievements)

### Eksempel: "Slayer" (Kill 1000 enemies)

```typescript
{
  id: 'slayer',
  name: 'Slayer',
  description: 'Kill 1000 enemies',
  category: 'combat',
  rarity: 'epic',
  icon: '💀',
  condition: (stats) => stats.totalKills >= 1000,
  progress: (stats) => ({
    current: stats.totalKills,
    max: 1000,
  }),
}
```

**UI Display:**
```
┌───────────────────────────────────┐
│ 💀 Slayer                         │
│ Kill 1000 enemies                 │
│ [████████░░] 437 / 1000 (43%)    │
└───────────────────────────────────┘
```

---

## Rarity Guidelines

| Rarity | Criteria | Examples |
|--------|----------|----------|
| **Common** | Naturlig progresjon, alle spillere oppnår | "First Blood", "Wave Warrior" |
| **Rare** | Krever dedikasjon, ~50% spillere oppnår | "Boss Slayer", "Wealthy" |
| **Epic** | Utfordrende, ~20% spillere oppnår | "Slayer", "Paragon Master" |
| **Legendary** | Ekstremt vanskelig, <5% spillere oppnår | "Untouchable", "Flawless Victory" |

---

## Testing Checklist

### Manual Testing

- [ ] Kill first enemy → "First Blood" unlocks
- [ ] Complete wave → "Wave Warrior" unlocks (if 10+ waves)
- [ ] Die → death counter increments (no unlock expected)
- [ ] Beat boss → "Boss Slayer" unlocks
- [ ] Complete level → "Champion" unlocks (if level 10)
- [ ] Ascend to Paragon 1 → "Ascended" unlocks

### Automated Testing (Future)

```typescript
// __tests__/AchievementManager.test.ts
describe('AchievementManager', () => {
  it('should unlock "First Blood" on first kill', () => {
    const manager = new AchievementManager(mockScene);
    mockScene.events.emit('enemy-killed', { enemyType: 'goblin', isBoss: false });

    const profile = SaveManager.getActiveProfile();
    expect(profile.achievements).toContain('first_blood');
  });
});
```

---

## Performance Considerations

### Event Frequency
- `enemy-killed`: ~100-500 events per level
- `wave-complete`: ~10 events per level
- `level-complete`: 1 event per level

**Optimization:**
- Achievement conditions evaluated **only when relevant events fire**
- Short-circuit early: `if (alreadyUnlocked) return;`
- Batch save: Achievements lagres kun på level-complete/death

### Memory
- 30 achievements × 200 bytes = ~6 KB (neglisjerbart)
- AchievementManager holder kun nødvendige stats i memory

---

## Future Enhancements (Optional)

### 1. **Steam/Epic Achievements Integration**
```typescript
// Sync with platform achievements
if (window.steamAPI) {
  window.steamAPI.setAchievement(achievement.id);
}
```

### 2. **Daily/Weekly Challenges**
```typescript
interface DailyChallenge {
  id: string;
  description: string;
  expiresAt: number;
  reward: { coins: number };
  condition: (stats: AchievementStats) => boolean;
}
```

### 3. **Achievement Rewards**
```typescript
{
  id: 'first_ascension',
  name: 'First Ascension',
  reward: {
    coins: 1000,
    unlockedUpgrade: 'paragon_starter_pack',
  },
  // ...
}
```

### 4. **Hidden Achievements**
```typescript
{
  id: 'secret_boss',
  name: '???',
  description: 'Discover the hidden boss',
  hidden: true, // Don't show in list until unlocked
  // ...
}
```

---

## Feilsøking

### Achievement ikke låses opp

**Debug steps:**
1. Åpne DevTools Console
2. Sjekk om event emitteres:
   ```javascript
   scene.events.on('enemy-killed', (data) => console.log('Enemy killed:', data));
   ```
3. Sjekk `AchievementManager` event listeners:
   ```javascript
   console.log(scene.achievementManager); // Should exist
   ```
4. Sjekk achievement condition:
   ```javascript
   const stats = { totalKills: 1, /* ... */ };
   const achievement = ACHIEVEMENTS.find(a => a.id === 'first_blood');
   console.log(achievement.condition(stats)); // Should be true
   ```

### Achievement låses opp flere ganger

**Fix:** Legg til guard i `AchievementManager.checkAchievements()`:

```typescript
private checkAchievements() {
  const profile = SaveManager.getActiveProfile();
  if (!profile) return;

  ACHIEVEMENTS.forEach(ach => {
    // Skip if already unlocked
    if (profile.achievements.includes(ach.id)) return;

    const stats = this.buildStats(profile);
    if (ach.condition(stats)) {
      this.unlockAchievement(ach);
    }
  });
}
```

---

## Konklusjon

Achievement systemet i Kringsringen gir:
- ✅ 30+ varierte achievements på tvers av 5 kategorier
- ✅ Real-time unlock notifications med lyd + toast
- ✅ Progress tracking for incremental achievements
- ✅ Persistent lagring i ParagonProfile
- ✅ Enkel extensibility (legg til nye achievements i 5 minutter)

Ved spørsmål, se `src/config/achievements.ts` eller `src/game/AchievementManager.ts`.
