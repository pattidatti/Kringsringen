# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # TypeScript compile + Vite build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

No test suite is configured.

## Architecture

Kringsringen is a **hybrid React + Phaser 3** browser game. React handles all UI overlays; Phaser handles the game canvas, physics, and game logic. They communicate via the **Phaser Registry** (a global key-value store).

### Data flow

```
App.tsx → GameContainer.tsx
              ├── Phaser.Game (canvas)
              │     ├── PreloadScene  (asset loading)
              │     └── MainScene     (gameplay)
              └── React overlays (TopHUD, Hotbar, FantasyBook, GameOverOverlay)
```

`GameContainer` creates the Phaser instance and renders React UI on top of the canvas. The `useGameRegistry` hook subscribes to Phaser registry change events and triggers React re-renders, keeping the two systems in sync without shared state management libraries.

### Phaser game systems (`src/game/`)

All major mechanics are encapsulated in manager classes owned by `MainScene` (`main.ts`):

| Manager | Responsibility |
|---|---|
| `PlayerStatsManager` | Derives all player stats from upgrade levels stored in the registry |
| `PlayerCombatManager` | Damage intake, armor, invincibility frames, knockback |
| `WaveManager` | Wave/level scheduling and enemy spawning |
| `ObjectPoolManager` | Reusable damage text, blood VFX, explosion sprites |
| `AudioManager` | Music and SFX playback via scene context |
| `SpatialHashGrid` | Fast enemy proximity lookups for collision |
| `CircularForestMapGenerator` | Procedural per-level map with dynamic themes |

Weapon projectiles (`Arrow`, `Fireball`, `FrostBolt`) are independent classes managed by arcade physics groups in `MainScene`.

### Configuration (`src/config/`)

Balance values live here, not in game classes:

- `GameConfig.ts` – player base stats, enemy stat templates, global constants
- `enemies.ts` – enemy type definitions (sprite, animations, stat multipliers)
- `upgrades.ts` – shop catalog with base prices and scaling
- `weapons.ts` – weapon hotkey bindings
- `ui-atlas.ts` – UI sprite atlas frame name mappings

### React UI (`src/components/`)

- `GameContainer.tsx` – top-level orchestrator; also handles pause when shop is open
- `ui/FantasyBook.tsx` – the in-game shop (pauses Phaser while open)
- `ui/TopHUD.tsx`, `ui/Hotbar.tsx` – live HUD reading from Phaser registry
- `hooks/useGameRegistry.ts` – the bridge: listens to `registry.events` and returns current registry values

### Asset loading

`PreloadScene` calls `AssetLoader` to load all sprites and audio before `MainScene` starts. Audio metadata is declared in `AudioManifest.ts`. Sprite atlases are in `public/assets/`.

### Phaser Registry keys (shared state contract)

The registry is the source of truth for game state visible to React. Key names include: `playerHP`, `playerMaxHP`, `playerCoins`, `playerDamage`, `playerSpeed`, `upgradeLevels`, `currentWeapon`, `unlockedWeapons`, `gameLevel`, `currentWave`. Both `MainScene` and React components read/write through this contract.

### Upgrade economy

Upgrade cost formula: `cost = basePrice * (currentLevel ^ priceScale)` (exponential scaling). Upgrade definitions are in `src/config/upgrades.ts`.

### Map generation

`CircularForestMapGenerator` generates a new map per level with a theme derived from the level number. Maps use tile layers with obstacles forming Arcade Physics bodies.
