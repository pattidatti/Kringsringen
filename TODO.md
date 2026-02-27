# Ekspansjons-TODO – Kringsringen

Rammeverket er nå expansion-ready (se `CLAUDE.md` for arkitektur).
Dette dokumentet holder styr på **innholdsjobben** som gjenstår.

---

## Slik legger du til et nytt level

1. **`src/config/levels.ts`** – legg til en ny entry i `LEVEL_CONFIG`
2. **`src/game/StaticMapData.ts`** – legg til `buildLevelN()` og push til `STATIC_MAPS`
3. **`src/config/wave_compositions.ts`** – legg til `N-1`, `N-2`, `N-3` entries
4. **`src/config/bosses.ts`** (valgfritt) – ny boss med `afterLevel: N`
5. **`src/game/BossEnemy.ts`** (valgfritt) – ny `case` i `activateAbilities()` + ability-metoder

---

## Bosser

| # | Navn | Etter level | Status |
|---|------|-------------|--------|
| 1 | Orkehøvdingen | L2 | ✅ Ferdig |
| 2 | Skjelettoverlorden | L4 | ✅ Ferdig |
| 3 | Alfa-Varulven | L6 | ✅ Ferdig |
| 4 | Trollhersker Grak | L8 | ✅ Stub klar (trenger egne sprites) |
| 5 | Skjelettkongen | L10 | ✅ Stub klar (trenger egne sprites) |

### Gjenstår for Boss 4 & 5:
- [ ] Egne sprite-sheets (bruker nå `elite_orc` og `armored_skeleton` som stand-in)
- [ ] Dedikerte boss-animasjoner (shockwave, slam, etc.) registrert i `PreloadScene`
- [ ] Lydspor for Boss 4 (`glitch_in_the_dungeon` er placeholder)
- [ ] Balansejustering av HP/damage etter playtesting

---

## Fiender (mobs)

| Type | Status | Brukes i wave |
|------|--------|----------------|
| orc | ✅ | L1–L2 |
| slime | ✅ | L1 |
| skeleton | ✅ | L2 |
| armored_skeleton | ✅ | L7–L10 |
| greatsword_skeleton | ✅ | L3–L10 |
| werewolf | ✅ | L3–L10 |
| armored_orc | ✅ | L3–L10 |
| elite_orc | ✅ | L4–L10 |
| frost_wizard | ✅ | L3–L10 |
| wizard | ✅ | L2–L10 |
| skeleton_archer | ✅ | L2–L10 |
| healer_wizard | ✅ | L3–L10 |

### Nye fiender (trenger sprites + animasjoner + ENEMY_TYPES-entry):
- [ ] **Nekromant** – ranged mob som reiser den døde (summons), Akt 3 (L7+)
- [ ] **Troll** – svær melee med enorm HP, sakte, Akt 3 (L7+)
- [ ] **Skyggeassassin** – blinking melee, høy skade, lav HP, Akt 4 (L9+)
- [ ] **Vampyr** – livstyv, healer seg selv, Akt 4 (L9+)

---

## Kart

| Level | Navn | Status |
|-------|------|--------|
| L1 | Den Grønne Lysningen | ✅ |
| L2 | De Mørke Stiene | ✅ |
| L3 | Ulvemarka | ✅ |
| L4 | Trollskogen | ✅ |
| L5 | Skumringen | ✅ Stub |
| L6 | Ravinen | ✅ Stub |
| L7 | Katakombene | ✅ Stub |
| L8 | Trolldalen | ✅ Stub |
| L9 | Den Mørke Borg | ✅ Stub |
| L10 | Sluttboss-arenaen | ✅ Stub |

### Gjenstår for kart L5–L10:
- [ ] **Visuelle temaer** – alle kart bruker nå samme emerald-tre/stein-assets.
      Nye temaer (f.eks. mørk stein, snø, katakombe-fliser) krever nye sprite-atlas.
- [ ] **Ambient particles** – `AmbientSystem.setTheme(level)` kalles allerede,
      men støtter kun L1–L4 visuelt. Legg til themes for L5–L10.
- [ ] **Bakgrunnsmusikk** – BGM-spillelisten i `WaveManager.startLevel()` inneholder
      8 spor men kan trenge flere for 10 levels.

---

## Upgrade-shop

- [ ] Vurder nye oppgraderinger for sen-game (L7–L10): livstjeling, explosiv pil, frost-aura
- [ ] Prisbalanse for levels over L5 (nåværende priser er testet for L1–L5)

---

## Audio

| Spor | Brukes | Status |
|------|--------|--------|
| meadow_theme | BGM | ✅ |
| exploration_theme | BGM | ✅ |
| dragons_fury | BGM | ✅ |
| pixel_rush_overture | BGM | ✅ |
| glitch_in_the_forest | BGM | ✅ |
| glitch_in_the_dungeon | BGM (Boss 4 placeholder) | ✅ |
| glitch_in_the_catacombs | BGM | ✅ |
| glitch_in_the_heavens | BGM | ✅ |
| final_dungeon_loop | Boss 1 & 3 | ✅ |
| glitch_king | Boss 2 & 5 | ✅ |

- [ ] Dedikert boss-tema for Boss 4 (Trollhersker)
- [ ] Ekstra BGM-spor for L7–L10 (nå gjenbrukes spillelisten)

---

## Teknisk gjeld

- [ ] `CircularForestMapGenerator.ts` er ikke i bruk – vurder å slette eller reaktivere
      for prosedyregenererte kart på high-level (L11+)
- [ ] `bgmPlaylist` i `WaveManager` stokker bare 8 spor — vurder dedikert BGM per level
      i stedet for tilfeldig rekkefølge
- [ ] Boss 4 & 5 bruker eksisterende sprite-typer (`elite_orc`, `armored_skeleton`)
      som stand-in. Endre `enemyType` i `bosses.ts` når nye sprites er klare.
