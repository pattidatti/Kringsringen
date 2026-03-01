# Save / Load System — Technical Reference

> Singleplayer only. All save paths are gated behind `!isMultiplayer`.

---

## Two-Tier Storage

```
localStorage
├── kringsringen_save_v1   ← permanent (never cleared automatically)
└── kringsringen_run_v1    ← in-run snapshot (cleared on game over / new game)
```

| Key | Purpose | Cleared when |
|-----|---------|-------------|
| `kringsringen_save_v1` | Meta-progression: coins, highStage, audioSettings, graphicsQuality, tutorialSeen | Never (manual only) |
| `kringsringen_run_v1` | Full run snapshot: level, wave, enemies, position, upgrades | Game over or new game |

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
| Level complete | `MainScene` `level-complete` handler | ❌ | ❌ |
| Exit to menu | `GameContainer.handleExitToMenu()` → `request-save` event → `MainScene.collectSaveData()` | ✅ | ✅ |
| Browser close (F5, tab close) | `window.beforeunload` → `collectSaveData()` | ✅ | ✅ |

Wave-start and level-complete saves are registry-only snapshots. They capture the wave counter and coins, but **not** enemy positions or player coordinates. The full-fidelity save (with enemy state and position) only happens on deliberate exit or browser close.

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
