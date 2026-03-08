# Paragon Expansion Plan - Kringsringen

## Design Decisions
- **Progression**: Keep all upgrades/coins/weapons between Paragon tiers (Diablo-style)
- **Auth**: Later phase - localStorage first
- **New abilities**: Both new abilities AND mutations of existing
- **Achievements**: Gameplay challenges (creative, not just milestones)
- **Permadeath**: Removed for Paragon characters - persistent progression

---

## Phase 1: Paragon Core System
**Goal**: When player beats level 10, they can "Ascend" to Paragon 1 and replay levels 1-10 with scaled difficulty. All upgrades/coins/weapons persist.

### Data Structures

```typescript
// New: ParagonProfile (persistent, stored in SaveManager)
interface ParagonProfile {
  id: string;                              // UUID
  name: string;                            // Character name
  classId: ClassId;                        // krieger | archer | wizard | skald
  paragonLevel: number;                    // 0 = first playthrough, 1+ = Paragon
  currentGameLevel: number;                // 1-10, which level they're on
  currentWave: number;
  coins: number;
  upgradeLevels: Record<string, number>;   // All purchased upgrades
  unlockedWeapons: string[];
  paragonUpgrades: Record<string, number>; // Paragon-exclusive upgrades
  playerHP: number;
  playerMaxHP: number;
  totalPlayTime: number;                   // Seconds
  totalKills: number;
  highestLevelReached: number;             // Across all Paragon tiers
  createdAt: number;
  lastPlayedAt: number;
  achievements: string[];                  // Achievement IDs earned
}
```

### Difficulty Scaling (per Paragon level)

```typescript
// src/config/paragon.ts
const PARAGON_SCALING = {
  enemyHPMultiplier: 1.4,          // Per paragon level (P1 = 1.4x, P2 = 1.96x, P5 = 5.4x)
  enemyDamageMultiplier: 1.25,     // Per paragon level
  enemySpeedMultiplier: 1.05,      // Subtle per paragon level
  enemyCountMultiplier: 1.15,      // More enemies per wave
  coinMultiplier: 1.3,             // More coins to match difficulty
  bossHPMultiplier: 1.5,           // Bosses scale harder
  maxParagonLevel: 10,             // Cap at Paragon 10
};
```

### Key Changes

| File | Change |
|------|--------|
| `src/config/paragon.ts` | **NEW** - Paragon scaling config, Paragon upgrade definitions |
| `src/game/SaveManager.ts` | Replace single-run saves with multi-character `ParagonProfile[]` storage |
| `src/game/WaveManager.ts` | Apply Paragon difficulty multipliers to enemy stats/counts |
| `src/game/main.ts` | Read `paragonLevel` from registry, pass to WaveManager |
| `src/config/levels.ts` | Scaling functions that accept paragonLevel parameter |
| `src/components/ui/GameOverOverlay.tsx` | "Defeated" → respawn at level start (no permadeath) with gold penalty |
| Victory screen (NEW) | When beating level 10: "Ascend to Paragon X+1?" prompt |

### Victory / Ascension Flow
1. Player beats level 10 boss
2. Victory overlay shows: stats summary, "ASCEND TO PARAGON {n+1}" button
3. On ascend: `paragonLevel++`, `currentGameLevel = 1`, keep all upgrades/coins
4. Difficulty scales up per formula
5. Save profile

### Death Handling (No Permadeath)
- On death: lose 10% of coins (configurable), respawn at start of current level
- Keep all upgrades, weapons, progress
- "Game Over" overlay becomes "Defeated" with "Retry Level" and "Return to Menu" buttons

---

## Phase 2: Character Select & Profile System
**Goal**: Multiple character slots, visual character select screen.

### UI Components

| Component | Purpose |
|-----------|---------|
| `CharacterSelectScreen.tsx` | **NEW** - Grid of character cards + "New Character" slot |
| `CharacterCard.tsx` | **NEW** - Shows class icon, name, Paragon level, last played |
| `NewCharacterModal.tsx` | **NEW** - Name input + class picker (replaces current ClassSelector) |

### Flow
```
LandingPage → CharacterSelectScreen
                ├── [Existing Character Card] → Load profile → GameContainer
                ├── [Existing Character Card] → Load profile → GameContainer
                └── [+ New Character] → NewCharacterModal → ClassSelector → GameContainer
```

### Save Structure
```typescript
// localStorage key: 'kringsringen_profiles_v1'
interface ProfileStore {
  profiles: ParagonProfile[];    // Max 6 character slots
  activeProfileId: string | null;
  globalSettings: {
    audioSettings: AudioSettings;
    graphicsQuality: string;
    tutorialSeen: boolean;
  };
}
```

---

## Phase 3: Level Select & Farming
**Goal**: After first clear, players can replay any previously beaten level.

### UI
- **Level Select Screen** (`LevelSelectScreen.tsx`): Grid/list of levels 1-10
  - Locked levels shown greyed out
  - Cleared levels show star/checkmark
  - Current progress level highlighted
  - Each level shows: name, enemy types, boss (if any), difficulty rating
  - "Continue" button goes to highest incomplete level

### Implementation
- Add `clearedLevels: number[]` to ParagonProfile
- LevelSelectScreen reads from profile, allows selecting any cleared level
- WaveManager accepts `targetLevel` parameter
- Coins earned from farming are reduced (e.g., 50% on replayed levels) to prevent trivial farming

---

## Phase 4: Paragon Unlocks & New Abilities
**Goal**: Powerful upgrades/abilities only available at higher Paragon levels.

### Paragon Upgrade Categories

#### A) Paragon Passive Upgrades (FantasyBook, new "Paragon" tab)
Gated behind Paragon level requirements. Appear in FantasyBook with a special gold/diamond border.

```typescript
// Examples in src/config/paragon-upgrades.ts
{
  id: 'paragon_vitality',
  title: 'Udødelig Vitalitet',
  category: 'Paragon',
  summary: '+50 Max HP per level',
  maxLevel: 10,
  basePrice: 2000,
  priceScale: 2.0,
  paragonRequired: 1,    // NEW field
}
```

#### B) Paragon Abilities (New hotkeys E, F, Q)
Three new ability slots unlocked at Paragon 2, 4, 6.

**Krieger Paragon Abilities:**
- E (P2): **Earthquake Slam** - AoE ground pound, stuns nearby enemies
- F (P4): **Blood Rage** - 10s buff: +50% damage, +30% speed, take 20% more damage
- Q (P6): **Titan's Shield** - 5s invulnerability barrier + reflect projectiles

**Archer Paragon Abilities:**
- E (P2): **Rain of Arrows** - AoE arrow barrage in target area
- F (P4): **Shadow Step** - Teleport behind nearest enemy + guaranteed crit
- Q (P6): **Phoenix Arrow** - Massive fire arrow that explodes + leaves burning ground

**Wizard Paragon Abilities:**
- E (P2): **Meteor Shower** - Channel: meteors rain in area for 3s
- F (P4): **Time Warp** - Slow all enemies in radius by 80% for 4s
- Q (P6): **Arcane Nova** - Massive explosion centered on player, scales with all element upgrades

**Skald Paragon Abilities:**
- E (P2): **War Hymn** - AoE buff: all allies +25% damage for 8s
- F (P4): **Dissonance** - AoE debuff: enemies take +40% damage for 5s
- Q (P6): **Ragnarök Vers** - Ultimate: all 4 Vers activate simultaneously for 10s

#### C) Weapon Mutations (Existing weapons transform)
At Paragon 3+, specific upgrades "mutate" existing weapons:
- Fireball → **Inferno Orb** (passes through enemies, leaves fire trail)
- Frost Bolt → **Blizzard Shard** (freezes in AoE, shatters for bonus damage)
- Arrow → **Spectral Arrow** (pierces all, marks enemies for bonus damage)
- Sword → **Vorpal Blade** (wider arc, % chance for instant kill on low HP enemies)

### Hotbar Changes
```typescript
// Extend weapon slots to include Paragon abilities
PARAGON_ABILITY_SLOTS: [
  { id: 'paragon_e', hotkey: 'E', icon: 'dynamic', unlocksAt: 2 },
  { id: 'paragon_f', hotkey: 'F', icon: 'dynamic', unlocksAt: 4 },
  { id: 'paragon_q', hotkey: 'Q', icon: 'dynamic', unlocksAt: 6 },
]
```

Hotbar.tsx extended with a secondary row or appended slots for E/F/Q.

### Key Files
| File | Change |
|------|--------|
| `src/config/paragon-upgrades.ts` | **NEW** - Paragon passive upgrades |
| `src/config/paragon-abilities.ts` | **NEW** - Paragon ability definitions per class |
| `src/config/weapon-mutations.ts` | **NEW** - Mutation definitions |
| `src/game/ParagonAbilityManager.ts` | **NEW** - Handles E/F/Q ability execution, cooldowns |
| `src/game/abilities/` | **NEW** - Individual ability classes (EarthquakeSlam.ts, etc.) |
| `src/components/ui/Hotbar.tsx` | Add Paragon ability slots |
| `src/components/ui/FantasyBook.tsx` | Add "Paragon" tab with gated upgrades |
| `src/game/PlayerStatsManager.ts` | Apply Paragon passive bonuses |

---

## Phase 5: Firebase Auth & Cloud Save (Later)
**Goal**: Google Auth, user profiles, cloud sync.

### Components
- `AuthProvider.tsx` - Firebase Auth context
- `LoginModal.tsx` - Google sign-in button + guest mode
- `ProfilePage.tsx` - Account info, linked characters, cloud sync status
- `CloudSaveManager.ts` - Sync localStorage profiles to Firestore

### Flow
- Optional: game works fully offline with localStorage
- On sign-in: merge local profiles with cloud
- Auto-sync on save (debounced)
- Conflict resolution: latest timestamp wins

---

## Phase 6: Achievements
**Goal**: Creative gameplay challenges that reward skilled play.

### Achievement Categories

**Combat Mastery:**
- "Uberørt" - Beat a boss without taking damage
- "Sverddansen" - Kill 20 enemies in 10 seconds (Krieger)
- "Presisjonsskyting" - 50 consecutive arrow hits without miss (Archer)
- "Elementmester" - Kill an enemy with all 3 elements in one fight (Wizard)
- "Perfekt Rytme" - Maintain 4 Vers for 60 seconds straight (Skald)

**Survival:**
- "Siste Mann" - Survive with <5% HP for 30 seconds
- "Ingen Dash" - Complete a level without using dash
- "Bare Sverd" - Complete a level using only basic weapon (no abilities)
- "Speedrun" - Complete level 10 in under 3 minutes

**Paragon:**
- "Første Oppstigelse" - Reach Paragon 1
- "Veteran" - Reach Paragon 5
- "Legende" - Reach Paragon 10
- "Samler" - Max out all upgrades in any category
- "Mester av Alle" - Reach Paragon 3 with all 4 classes

### Implementation
```typescript
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'combat' | 'survival' | 'paragon' | 'exploration';
  tracker: AchievementTracker;  // Logic for checking completion
  reward?: { type: 'coins' | 'title' | 'cosmetic'; value: string | number };
}
```

| File | Purpose |
|------|---------|
| `src/config/achievements.ts` | **NEW** - Achievement definitions |
| `src/game/AchievementManager.ts` | **NEW** - Tracks progress, fires events |
| `src/components/ui/AchievementPopup.tsx` | **NEW** - Toast notification on unlock |
| `src/components/ui/AchievementList.tsx` | **NEW** - Full achievement browser |

---

## Implementation Order

### Milestone 1 (Phase 1+2): Core Loop ← **START HERE**
1. `src/config/paragon.ts` - Paragon config
2. `src/game/SaveManager.ts` - Multi-character profiles
3. `src/game/WaveManager.ts` - Paragon difficulty scaling
4. `src/game/main.ts` - Registry integration
5. Death handling changes (no permadeath)
6. Victory/Ascension overlay
7. `CharacterSelectScreen.tsx` + `CharacterCard.tsx`
8. Landing page flow update

### Milestone 2 (Phase 3): Level Select
9. `LevelSelectScreen.tsx`
10. Level clear tracking in profiles
11. Farm coin reduction logic

### Milestone 3 (Phase 4): Paragon Content
12. `paragon-upgrades.ts` + FantasyBook Paragon tab
13. `paragon-abilities.ts` + ability classes
14. `ParagonAbilityManager.ts` + Hotbar extension
15. Weapon mutations

### Milestone 4 (Phase 6): Achievements
16. Achievement definitions + manager
17. Achievement UI (popup + list)

### Milestone 5 (Phase 5): Cloud Save (Future)
18. Firebase Auth integration
19. Cloud sync
20. Profile UI
