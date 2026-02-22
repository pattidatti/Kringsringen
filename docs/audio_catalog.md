# Kringsringen — Audio Catalog

## Active Sounds

### BGM (Background Music)

| ID | File | Volume | Loop |
|:---|:---|:---|:---|
| `meadow_theme` | `assets/audio/music/meadow_theme.mp3` | 0.5 | ✅ |
| `exploration_theme` | `assets/audio/music/exploration_theme.mp3` | 0.5 | ✅ |
| `dragons_fury` | `assets/audio/music/dragons_fury.mp3` | 0.6 | ✅ |

### SFX (Sound Effects)

| ID | Files | Variants | Volume | Pitch Variance | Used By |
|:---|:---|:---|:---|:---|:---|
| `swing` | `sword_attack_1-3.wav` | 3 | 0.4 | ±0.1 | `main.ts` → `player-swing` event |
| `hit` | `sword_impact_1-3.wav` | 3 | 0.5 | — | `main.ts` → `enemy-hit` event |
| `coin_collect` | `coin_collect_1-2.wav` | 2 | 0.35 | ±0.05 | `WaveManager.ts` → coin pickup |
| `ui_click` | `ui_click.wav` | 1 | 0.3 | — | `FantasyButton.tsx` → button click |

All SFX files are in `public/assets/audio/sfx/`.

---

## WAV Library Inventory

Source: `WAV Files/` (project root). **Not** shipped in builds — used as a source pool.

### SFX Categories

| Category | Files | Notes |
|:---|:---|:---|
| **Sword Attacks & Blocks** | Attack ×3, Impact ×3, Blocked ×3, Parry ×3, Sheath ×2, Unsheath ×2 | Combat core |
| **Bow Attacks & Blocks** | Attack ×2, Impact ×3, Blocked ×3, Put Away ×1, Take Out ×1 | Ranged combat |
| **Spells** | Fireball ×3, Firebuff ×2, Firespray ×2, Ice (Barrage/Freeze/Throw/Wall) ×2 ea, Rock (Meteor/Wall) ×2 ea, Spell Impact ×3, Water ×4 | Future magic |
| **Chopping & Mining** | Chop ×4, Mine ×5 | Resource gathering |
| **Doors, Gates & Chests** | Chest Open/Close ×2, Door Open/Close ×2, Gate ×2, Lock ×1, Portcullis ×1 | UI/interaction |
| **Footsteps** | Dirt ×24, Stone ×24, Water ×24, Wood ×24 | Per-surface movement |
| **Torch** | Light ×2, Loop ×3, Attack Strike ×2, Impact ×2 | Environment |
| **Waterfalls** | River Loop, River Stream Loop, Waterfall Loop | Ambient |

### BGS Loops (Background Soundscapes)

| Environment | Variants |
|:---|:---|
| Beach, Cave, Forest Day, Forest Night, Interior Day, Interior Night, Sea | Base + Rain + Storm (×3 each) |

---

## GDD Future Sound Mapping

| Game Feature | Recommended WAV(s) | Priority |
|:---|:---|:---|
| Bow attacks (Flerskudd) | `Bow Attack 1-2.wav` | High |
| Arrow impact | `Bow Impact Hit 1-3.wav` | High |
| Skeleton Captain block | `Bow Blocked 1-3.wav` | Medium |
| Spell system | `Fireball`, `Spell Impact` series | Low |
| Footsteps | `Footsteps/Dirt/*` (Map 1) | Medium |
| Map 1 ambience | `Forest Day.wav` | Medium |
| Merchant shop | `Chest Open 1.wav` | Low |
| Enemy death | `chop 1-4.wav` | Medium |

---

## How to Add a New Sound

1. **Copy** the WAV from `WAV Files/` to `public/assets/audio/sfx/` with snake_case name
2. **Add entry** to `AUDIO_MANIFEST` in `src/game/AudioManifest.ts`:
   - Single file: use `path`
   - Multiple variants: use `variants` array
3. **Play** via `AudioManager.instance.playSFX('your_id')`
4. **Update this doc** with the new entry
