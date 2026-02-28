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
              │     └── MainScene ←→ NetworkManager (PeerJS/WebRTC, optional)
              └── React overlays (TopHUD, Hotbar, FantasyBook, BossHUD,
                                  MultiplayerLobby, GameOverOverlay, …)
```

`GameContainer` creates the Phaser instance and renders React UI on top of the canvas. The `useGameRegistry` hook subscribes to Phaser registry change events and triggers React re-renders, keeping the two systems in sync without shared state management libraries. In multiplayer mode, `NetworkManager` runs inside `MainScene` to sync player state across peers.

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
| `WeatherManager` | Rain and fog particle effects per level |
| `AmbientParticleManager` | Fireflies / leaves / embers ambient VFX by level theme |
| `SaveManager` | Persist run state to `localStorage` (`kringsringen_save_v1`) |

Weapon projectiles (`Arrow`, `Fireball`, `FrostBolt`, `LightningBolt`, `Singularity`, `EclipseWake`) are independent classes managed by arcade physics groups in `MainScene`. Enemy-fired projectiles (`EnemyProjectile`) are pooled via `ObjectPoolManager`. `BossEnemy` is an independent boss entity class (similar structure to `Enemy` but with phases and special abilities).

### Configuration (`src/config/`)

Balance values live here, not in game classes:

- `GameConfig.ts` – player base stats, enemy stat templates, global constants
- `enemies.ts` – enemy type definitions (sprite, animations, stat multipliers)
- `bosses.ts` – 5 boss definitions (trigger level, HP, phases, music)
- `levels.ts` – per-level config: wave count, enemies-per-wave, HP multiplier
- `wave_compositions.ts` – enemy type weighting per wave (`"level-wave"` key → `{meleePool, rangedPool}`)
- `upgrades.ts` – shop catalog with base prices and scaling
- `weapons.ts` – weapon hotkey bindings
- `QualityConfig.ts` – graphics quality tiers (low/medium/high): particles, lighting, bloom, postFX
- `firebase.ts` – Firebase Realtime DB config + `HighscoreManager` (submit/fetch/subscribe)
- `ui-atlas.ts` – UI sprite atlas frame name mappings

### React UI (`src/components/`)

**Core:**
- `GameContainer.tsx` – top-level orchestrator; creates Phaser instance, handles pause when shop is open
- `LandingPage.tsx` – start/title screen

**HUD overlays:**
- `ui/TopHUD.tsx`, `ui/Hotbar.tsx` – live HUD reading from Phaser registry
- `ui/BossHUD.tsx`, `ui/BossSplashScreen.tsx` – boss fight overlays
- `ui/DashCooldownBar.tsx` – dash ability cooldown indicator
- `ui/GameOverOverlay.tsx` – game over screen

**Menus & modals:**
- `ui/FantasyBook.tsx` – the in-game shop (pauses Phaser while open)
- `ui/MultiplayerLobby.tsx` – multiplayer lobby (room creation, join, ready states)
- `ui/OnboardingTutorial.tsx` – first-run tutorial
- `ui/SettingsModal.tsx`, `ui/SettingsContent.tsx` – settings panel
- `ui/HighscoresModal.tsx`, `ui/HighscoreNotification.tsx` – Firebase leaderboard

**UI design system:**
- `ui/FantasyButton.tsx`, `ui/FantasyPanel.tsx`, `ui/FantasyProgressBar.tsx`, `ui/FantasyIcon.tsx` – styled fantasy UI components
- `ui/PerkCard.tsx` – upgrade card display

**Hooks:**
- `hooks/useGameRegistry.ts` – the bridge: listens to `registry.events` and returns current registry values
- `hooks/useGameRegistryThrottled.ts` – throttled variant for performance-sensitive reads
- `hooks/useHighscores.ts` – subscribes to Firebase highscores
- `hooks/useSprite.ts` – sprite frame lookup utility

### Asset loading

`PreloadScene` calls `AssetLoader` to load all sprites and audio before `MainScene` starts. Audio metadata is declared in `AudioManifest.ts`. Sprite atlases are in `public/assets/`.

### Multiplayer / Network (`src/network/`, `src/services/`)

Optional P2P multiplayer via PeerJS/WebRTC with host-authority model:

- `NetworkManager.ts` – PeerJS host/client manager, dual channels (reliable + unreliable), NTP time sync, simulated latency
- `BinaryPacker.ts` – binary wire format serializer/deserializer (perf vs JSON)
- `JitterBuffer.ts` – remote player interpolation + dead-reckoning
- `SyncSchemas.ts` – `PacketType` enum, `SyncPacket`, `PackedPlayer`, `PackedEnemy` types
- `Matchmaking.ts` – Firebase-backed room creation/joining

Full technical detail lives in `docs/multiplayer/architecture.md`.

### Phaser Registry keys (shared state contract)

The registry is the source of truth for game state visible to React. Key names include: `playerHP`, `playerMaxHP`, `playerCoins`, `playerDamage`, `playerSpeed`, `upgradeLevels`, `currentWeapon`, `unlockedWeapons`, `gameLevel`, `currentWave`. Both `MainScene` and React components read/write through this contract.

### Upgrade economy

Upgrade cost formula: `cost = basePrice * (currentLevel ^ priceScale)` (exponential scaling). Upgrade definitions are in `src/config/upgrades.ts`.

### Map generation

Primary runtime system: `StaticMapLoader` + `StaticMapData.ts` load pre-authored static maps per level. Legacy procedural generator: `CircularForestMapGenerator` (creates a circular clearing surrounded by forest ring per level theme). Maps use tile layers with obstacles forming Arcade Physics bodies.
