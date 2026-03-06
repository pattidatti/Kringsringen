# Kringsringen — Audio Catalog

## Active Sounds

### BGM (Background Music)

| ID | File | Volume | Loop |
|:---|:---|:---|:---|
| `meadow_theme` | `assets/audio/music/meadow_theme.mp3` | 0.5 | ✅ |
| `exploration_theme` | `assets/audio/music/exploration_theme.mp3` | 0.5 | ✅ |
| `dragons_fury` | `assets/audio/music/dragons_fury.mp3` | 0.6 | ✅ |
| `pixel_rush_overture` | `assets/audio/music/Pixel Rush Overture.mp3` | 0.5 | ✅ |
| `glitch_in_the_forest` | `assets/audio/music/Glitch in the forest.mp3` | 0.5 | ✅ |
| `glitch_in_the_dungeon` | `assets/audio/music/Glitch in the Dungeon.mp3` | 0.5 | ✅ |
| `glitch_in_the_catacombs`| `assets/audio/music/Glitch in the Catacombs.mp3`| 0.5 | ✅ |
| `glitch_in_the_heavens` | `assets/audio/music/Glitch in the heavens.mp3` | 0.5 | ✅ |
| `final_dungeon_loop` | `assets/audio/music/Final Dungeon Loop.mp3` | 0.6 | ✅ |
| `glitch_king` | `assets/audio/music/Glitch King.mp3` | 0.6 | ✅ |

### SFX (Sound Effects)

| ID | Files | Variants | Volume | Pitch Variance | Used By |
|:---|:---|:---|:---|:---|:---|
| `swing` | `sword_attack_1-3.wav` | 3 | 0.4 | ±0.1 | `main.ts` → `player-swing` event |
| `hit` | `sword_impact_1-3.wav` | 3 | 0.5 | — | `main.ts` → `enemy-hit` event |
| `bow_attack` | `bow_attack_1-2.wav` | 2 | 0.4 | ±0.1 | `WeaponManager.ts` → `executeBowAttack()` |
| `bow_impact` | `bow_impact_1-3.wav` | 3 | 0.45 | — | `Arrow.ts` → `hit()` |
| `footstep` | `dirt_run_1-5.wav` | 5 | 0.25 | ±0.15 | `main.ts` → player walk |
| `coin_collect` | `coin_collect_1-2.wav, pop_1-3.wav` | 5 | 0.25 | ±0.08 | `WaveManager.ts` → coin pickup |
| `ui_click` | `ui_click.wav` | 1 | 0.3 | — | `FantasyButton.tsx` → click |
| `weapon_pick_up` | `weapon_pick_up.wav`| 1 | 0.4 | — | `main.ts` → weapon switch |
| `fireball_cast` | `fireball_cast.wav` | 1 | 0.5 | — | `WeaponManager.ts` → `executeFireballAttack()` |
| `fireball_hit` | `fireball_hit.wav` | 1 | 0.5 | — | `Fireball.ts` → impact |
| `ice_throw` | `ice_throw.wav` | 1 | 0.5 | — | `WeaponManager.ts` → `executeFrostAttack()` |
| `ice_freeze` | `ice_freeze.wav` | 1 | 0.5 | — | `FrostBolt.ts` → status effect |
| `frost_impact` | `frost_impact.wav` | 1 | 0.55 | — | `FrostBolt.ts` → impact |
| `dash` | `whoosh_1.wav` | 1 | 1.0 | ±0.1 | `main.ts` → `player-dash` |
| `upgrade_buy` | `coins_gather_quick.wav`| 1 | 0.5 | — | `Merchant` → purchase |
| `page_turn` | `page_turn.wav` | 1 | 0.5 | — | `Merchant` → navigation |
| `paper_open` | `paper_move.wav` | 1 | 0.8 | — | `FantasyBook` → open |
| `paper_close` | `paper_move_reverse.wav` | 1 | 0.8 | — | `FantasyBook` → close |
| `lightning_cast` | `ice_throw.wav` (temp) | 1 | 0.5 | ±0.2 | `WeaponManager.ts` → `executeLightningAttack()` |
| `lightning_impact` | `ice_freeze.wav` (temp) | 1 | 0.55 | — | `LightningBolt.ts` → impact |
| `harp_cast` | `whoosh_1.wav` (temp) | 1 | 0.4 | ±0.15 | `WeaponManager.ts` → `executeHarpBoltAttack()` |
| `vers_cast` | `whoosh_1.wav` (temp) | 1 | 0.5 | ±0.20 | `ClassAbilityManager.ts` → `activateVersBolt()` |
| `ping` | `glass_ping_small.wav` | 1 | 0.3 | — | `NetworkManager` → latency check |
| `punch` | `punch.wav` | 1 | 0.45 | ±0.2 | Melee impact fallback |

#### Krieger Class Abilities

| ID | Files | Variants | Volume | Pitch Variance | Used By |
|:---|:---|:---|:---|:---|:---|
| `whirl_activate` | `sword_slice.wav` | 1 | 0.6 | ±0.12 | `ClassAbilityManager` → Whirlwind tick |
| `whirl_hit` | `sword_clash.wav`, `sword_clash_2.wav` | 2 | 0.5 | ±0.10 | `ClassAbilityManager` → Whirlwind on-hit |

All SFX files are in `public/assets/audio/sfx/`.

### BGS (Background Soundscapes)

| ID | File | Volume | Loop |
|:---|:---|:---|:---|
| `forest_ambience` | `assets/audio/bgs/forest_day.ogg` | 0.3 | ✅ |
| `rain` | `assets/audio/bgs/rain.ogg` | 0.6 | ✅ |

BGS plays independently of BGM via `AudioManager.playBGS()`.


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
