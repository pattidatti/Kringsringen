# Save / Load System — Technical Reference

> Singleplayer only. All save paths are gated behind `!isMultiplayer`.

---

## Three-Tier Storage

```
localStorage
├── kringsringen_profiles_v1  ← Paragon multi-character profiles (NEW)
├── kringsringen_save_v1      ← Legacy meta-progression (deprecated)
└── kringsringen_run_v1       ← In-run snapshot (compatibility bridge)
```

| Key | Purpose | Cleared when |
|-----|---------|-------------|
| `kringsringen_profiles_v1` | **Paragon profiles** (up to 6 characters, persistent progression) | Never (manual delete only) |
| `kringsringen_save_v1` | Legacy meta-progression (auto-migrated to first profile on startup) | After migration |
| `kringsringen_run_v1` | Full run snapshot: level, wave, enemies, position, upgrades | Game over or new game |

### ProfileStore Structure

```typescript
interface ProfileStore {
  profiles: ParagonProfile[];         // Up to 6 characters
  activeProfileId: string | null;     // Currently selected profile
  globalSettings: {
    audioSettings?: any;
    graphicsQuality?: string;
    tutorialSeen?: boolean;
  };
}
```

### ParagonProfile

Each profile represents a persistent character with full progression:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID (e.g., "abc-123-def") |
| `name` | `string` | Character display name |
| `classId` | `ClassId` | "krieger" \| "archer" \| "wizard" \| "skald" |
| `paragonLevel` | `number` | 0 = first playthrough, 1-10 = Paragon tiers |
| `currentGameLevel` | `number` | Which level (1-10) they're on |
| `currentWave` | `number` | Current wave within level |
| `coins` | `number` | Persistent gold (survives death) |
| `upgradeLevels` | `Record<string, number>` | All purchased upgrades |
| `unlockedWeapons` | `string[]` | Unlocked weapons |
| `currentWeapon` | `string` | Active weapon |
| `paragonUpgrades` | `Record<string, number>` | Paragon-exclusive upgrades |
| `achievements` | `string[]` | Unlocked achievement IDs |
| `totalKills` | `number` | Lifetime kill count |
| `totalDeaths` | `number` | Lifetime death count |
| `clearedLevels` | `number[]` | Levels beaten (for farming) |
| `playerHP` | `number` | Current HP |
| `playerMaxHP` | `number` | Max HP |
| `createdAt` | `number` | Unix timestamp |
| `lastPlayedAt` | `number` | Unix timestamp (used for sorting) |

---

## RunProgress Interface

Defined in `src/game/SaveManager.ts`:

| Field | Type | Description |
|-------|------|-------------|
| `gameLevel` | `number` | Current map level |
| `currentWave` | `number` | Wave number within the level |
| `playerCoins` | `number` | Gold collected this run |
| `upgradeLevels` | `Record<string, number>` | All upgrades purchased this run |
| `currentWeapon` | `string` | Active weapon hotkey/ID |
| `unlockedWeapons` | `string[]` | All unlocked weapons |
| `playerClass` | `'krieger' \| 'archer' \| 'wizard'` | Selected character class |
| `classAbilityLevel` | `number` | Class ability level (1-3) |
| `playerHP` | `number` | HP at save time |
| `playerMaxHP` | `number` | Max HP at save time |
| `playerX?` | `number` | Player world X at save time (optional) |
| `playerY?` | `number` | Player world Y at save time (optional) |
| `savedEnemies?` | `EnemySave[]` | Live enemy state at save time (optional) |
| `waveEnemiesRemaining?` | `number` | Enemies left to spawn in the wave (optional) |
| `savedAt` | `number` | Unix timestamp of the save |

### EnemySave

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Enemy type key (matches `src/config/enemies.ts`) |
| `x` | `number` | World X position |
| `y` | `number` | World Y position |
| `hp` | `number` | Current HP |
| `maxHP` | `number` | Max HP |

---

## Save Checkpoints

| Trigger | Caller | Player position saved? | Enemy state saved? |
|---------|--------|-----------------------|--------------------|
| Wave start | `WaveManager.startWave()` lines 86–98 | ❌ | ❌ |
| Level complete | `MainScene` `level-complete` handler | ✅ | ✅ |
| Exit to menu | `GameContainer.handleExitToMenu()` → `request-save` event → `MainScene.collectSaveData()` | ✅ | ✅ |
| Browser close (F5, tab close) | `window.beforeunload` → `collectSaveData()` | ✅ | ✅ |

Wave-start saves are registry-only snapshots. Level-complete, exit-to-menu, and browser-close saves are full-fidelity snapshots (including position and enemy state).

---

## Restore Sequence (`MainScene.create()`)

When the player chooses "Fortsett Spill" (continue), the following steps execute in order:

1. **Load** — `SaveManager.loadRunProgress()` reads `kringsringen_run_v1` from `localStorage`.
2. **Registry** — Set `gameLevel`, `currentWave`, `playerCoins`, `upgradeLevels`, `currentWeapon`, `unlockedWeapons` into the Phaser registry.
3. **Stats** — `PlayerStatsManager.recalculateStats()` re-derives all stats from the restored upgrade levels.
4. **HP** — `restoredHP` is clamped to the recalculated `maxHP` before being applied to the player.
5. **Position** — Player sprite is created at map center. If `playerX`/`playerY` exist in the save, `sprite.setPosition()` and `camera.centerOn()` are called to place and frame the player correctly.
6. **Enemies** — Two branches:
   - If `savedEnemies.length > 0`: `WaveManager.restoreWaveState()` spawns each enemy at its saved position with its saved HP, and resumes the spawn timer for `waveEnemiesRemaining`.
   - Else: `WaveManager.startLevel(level, savedWave)` starts a fresh wave at the correct wave number (enemies respawn normally).

---

## Multiplayer

Save and restore are singleplayer-only. All save entry points guard with `!isMultiplayer`. In multiplayer, game state is managed by host authority via `NetworkManager` and `BinaryPacker`; there is no localStorage persistence.

---

## Phaser Lifecycle & Destroy

When a player exits to the menu and then chooses "Fortsett Spill" (continue) **without refreshing the browser**, the old Phaser instance must be fully destroyed before a new one can be created. Phaser 3.80's `game.destroy(true)` is **asynchronous** — it does not tear down the canvas immediately. If `createGame()` runs while the old instance is still tearing down, the new game attaches to a stale or partially-disposed canvas, causing a permanent "Laster nivå..." loading overlay.

### Solution: Synchronous loop stop + cleanup-effect destroy

1. **`GameContainer.tsx` cleanup effect** — `game.loop.stop()` is called synchronously before `game.destroy(true)`. This halts the Phaser update loop immediately, preventing race conditions during teardown. The actual `destroy()` call lives in the React `useEffect` cleanup function so the canvas DOM node is still mounted when Phaser disposes it.

2. **`createGame()` ghost cleanup** — Before creating a new `Phaser.Game`, `createGame()` checks if a previous instance is still attached to the target container. If found, it calls `g.loop?.stop()` followed by `g.destroy(true)` to eliminate ghost instances that survived a fast menu→game transition.

3. **`PreloadScene` native timeout fallback** — `PreloadScene` originally used `this.time.delayedCall()` to emit `create-complete` after assets loaded. Because Phaser's internal clock depends on the game loop running, a stopped or re-creating loop could silently swallow the callback. The fix replaces this with a native `setTimeout()` that fires independently of Phaser's loop state, guaranteeing the loading overlay is dismissed.

### Destroy sequence (correct order)

```
handleExitToMenu()
  → save run to localStorage
  → setGameStarted(false)           // unmounts GameContainer
  → useEffect cleanup fires:
      game.loop.stop()              // synchronous halt
      game.destroy(true)            // async teardown begins
  → React unmounts canvas DOM

createGame() (on next "Fortsett Spill")
  → check for ghost Phaser instance
  → if found: g.loop.stop() + g.destroy(true)
  → new Phaser.Game(config)
  → PreloadScene loads assets
  → setTimeout → emit 'create-complete'   // native, not Phaser clock
  → MainScene.create() restores run
```
