# Kringsringen – Game Design Document (GDD)

Dette dokumentet beskriver spillmekanikken, fremgangen og det planlagte innholdet for **Kringsringen**.

> **Dokumentversjon:** 2.3
> **Sist oppdatert:** 1. mars 2026
> **Status-notasjon:** ✅ Implementert | ⚠️ Delvis/Bug | 🚧 Planlagt | ❌ Fjernet/Avlyst

---

## 1. Kjernekonsept og Mål

- **Mål:** Overlevelse. Ingen baser å beskytte. Spilleren vinner ved å overleve alle bølger på et kart-nivå.
- **Mekanikk:** Spilleren navigerer i et åpent landskap og bekjemper fiender som spawner i sirkler rundt spilleren.
- **Økonomi:** **Gull (Coins)** er den eneste ressursen. XP og karakternivåer er fjernet. Fiender dropper gull, som brukes til alle oppgraderinger hos Kjøpmann (Butikken).
- **Healing:** Spilleren får **Full HP** automatisk når et Map Level er fullført (alle bølger er bekjempet). ✅
- **Progresjon:** Vanlige nivåer veksler med bossbattles hvert annet nivå (etter level 2, 4, 6…). ✅

---

## 2. Nivå- og Bølgeoversikt

Hvert Map Level består av flere bølger. Vanskelighetsgraden øker gjennom multiplikatorer på fiendenes stats.

### Map Level 1: Den Grønne Lysningen ✅
- **Fullføringsbonus:** Full HP + 100 Gull bonus.
- **Musikk:** `meadow_theme.mp3`

| Wave | Fiendetyper | Antall | Multiplikator |
| :--- | :--- | :--- | :--- |
| **1** | Slime, Orc | 6 | 1.0x |
| **2** | Slime, Orc | 6 | 1.0x |

### Map Level 2: De Mørke Stiene ✅
- **Fullføringsbonus:** Full HP + 200 Gull bonus.
- **Musikk:** `exploration_theme.mp3`

| Wave | Fiendetyper | Antall | Multiplikator |
| :--- | :--- | :--- | :--- |
| **1** | Orc, Slime, Skeleton, Armored Skeleton | 8 | 1.2x |
| **2** | Orc, Slime, Skeleton, Armored Skeleton | 8 | 1.2x |
| **3** | Orc, Slime, Skeleton, Armored Skeleton | 8 | 1.2x |

### 🔥 Boss Level 1: Orkehøvdingen ✅
> Utløses etter Level 2. Se seksjon 4 for detaljer.

### Map Level 3: Ulvemarka ✅
- **Fullføringsbonus:** Full HP + 350 Gull bonus.
- **Musikk:** `dragons_fury.mp3`

| Wave | Fiendetyper | Antall | Multiplikator |
| :--- | :--- | :--- | :--- |
| **1** | Werewolf, Armored Orc, Skeleton, Armored Skeleton | 12 | 1.5x |
| **2** | Werewolf, Armored Orc, Skeleton, Armored Skeleton | 12 | 1.5x |
| **3** | Werewolf, Armored Orc, Skeleton, Armored Skeleton | 12 | 1.5x |

### Map Level 4: *(Navn mangler)* 🚧
- **Musikk:** *(ikke tildelt)*
- **Bølger:** 4 | **Antall:** 15/bølge | **Multiplikator:** 2.0x
- Introduserer: Elite Orc og Greatsword Skeleton.

### 🔥 Boss Level 2: Skjelettoverlorden ✅
> Utløses etter Level 4. Se seksjon 4 for detaljer.

### Map Level 5+: Endelig utfordring 🚧
- **Bølger:** 5 | **Antall:** 20/bølge | **Multiplikator:** 3.0x
- Alle fiendetyper i miks.

### 🔥 Boss Level 3: Alfa-Varulven ✅
> Utløses etter Level 6. Se seksjon 4 for detaljer.

### Map Level 7: De Glemte Katakombene 🚧
- **Musikk:** `glitch_in_the_catacombs.mp3`
- Introduserer: Healer Wizard og Skeleton Archer.

### 🔥 Boss Level 4: Trollhersker Grak ✅ 💎
> Utløses etter Level 8. Se seksjon 4 for detaljer.

### Map Level 9: Himmelfallet 🚧
- **Musikk:** `glitch_in_the_heavens.mp3`

### 🔥 Boss Level 5: Skjelettkongen ✅ 💎
> Utløses etter Level 10. Se seksjon 4 for detaljer.

> **⚠️ Musikk:** Level 4+ har nå musikk-IDer tildelt i systemet, men mangler unike spor i WaveManager-hardkodingen for noen nivåer.

---

## 3. Fiender (Bestiarium)

Alle fiendetyper er konfigurert i `src/config/enemies.ts` med sprite, animasjoner og stats.

### Standard Fiender

| Type | HP | Skade | Fart | Knockback-res. | Implementert |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Slime** | 30 | 5 | 80 | 0.2 | ✅ |
| **Orc** | 50 | 10 | 100 | 0.0 | ✅ |
| **Skeleton** | 40 | 15 | 110 | 0.1 | ✅ |
| **Armored Skeleton** | 150 | 30 | 100 | 0.6 | ✅ |
| **Werewolf** | 120 | 25 | 160 | 0.5 | ✅ |
| **Armored Orc** | 250 | 45 | 80 | 0.9 | ✅ |
| **Greatsword Skeleton** | 200 | 40 | 90 | 0.8 | ✅ |
| **Elite Orc** | 300 | 50 | 110 | 0.7 | ✅ |
#### Frost Wizard
- **Beskrivelse:** Magic user som kaster fryse-formler.
- **Base Stats:** 80 HP, 70 Speed, 25 Damage (Frost).
- **Spesialisering:** `burstCount`: 8. Fyrer en sirkel av frostbolter (Radial Burst) med 250ms windup. ✅
- **Viktig:** Eksplosjon ved treff gir AoE slow-effekt.

#### Wizard
- **Beskrivelse:** Magic user som skyter ildkuler med AoE-skade.
- **Base Stats:** 100 HP, 75 Speed, 35 Damage (Fire).
- **Synergi:** Thermal Shock (Ild + Is = 3x skade). ✅

#### Skeleton Archer
- **Beskrivelse:** Ranged attacker som fyrer piler fra avstand.
- **Base Stats:** 60 HP, 90 Speed, 20 Damage.
- **Spesialisering:** `multiShotCount`: 3. Fyrer 3 piler i en vifte (v2.0+) når cooldown tillater. ✅
- **Viktig:** Piler kan nå blokkeres eller unngås ved å dashe.
| **Healer Wizard** | 150 | 50* | 95 | 0.3 | ✅ |

> *Alle stats er base-verdier og skaleres med niveau-multiplikatoren.*


---

## 4. Bosser

Bosser spawner etter fullføring av bestemte nivåer via `src/config/bosses.ts` og `BossEnemy.ts`.
Splashscreen, dedikert boss-musikk og HP-bar er implementert (`BossHUD`, `BossSplashScreen`).

### Orkehøvdingen – *The Orc Warchief* ✅
- **Etter:** Level 2 | **Musikk:** `Final Dungeon Loop.mp3`
- HP: 800 | Skade: 30 | Fart: 80 | Skala: 3.0x
- **Abilities fase 1:** Shockwave (5s), Charge (8s)
- **Abilities fase 2** (< 50% HP): Shockwave (3s), Charge (5s) + +50% permanent fartboost
- **Fase 2 trigger:** 50% HP

### Skjelettoverlorden – *The Skeleton Overlord* ✅
- **Etter:** Level 4 | **Musikk:** `Glitch King.mp3`
- HP: 1500 | Skade: 50 | Fart: 75 | Skala: 2.5x
- **Abilities fase 1:** Raise Dead – 2 skeleton-minions (6s), Bone Volley – 3 prosjektiler (4s)
- **Abilities fase 2:** Raise Dead – 3 minions (4s), Bone Volley – 5 prosjektiler (2.5s)
- **Fase 2 trigger:** 50% HP

### Alfa-Varulven – *The Alpha Werewolf* ✅
- **Etter:** Level 6 | **Musikk:** `Final Dungeon Loop.mp3`
- HP: 2500 | Skade: 70 | Fart: 100 (+ Blood Frenzy) | Skala: 2.5x
- **Passiv – Blood Frenzy:** Fart øker kontinuerlig etter tap av HP (opp til +50%)
- **Abilities fase 1:** Feral Howl – 3 werewolf-minions (8s), Predator Dash – teleport + AoE (4s)
- **Abilities fase 2:** Feral Howl – 4 minions (5s), Predator Dash (2.5s)
- **Fase 2 trigger:** 50% HP

### Trollhersker Grak – *The Troll Warlord* ✅ 💎
- **Etter:** Level 8 | **Musikk:** `Glitch in the Dungeon.mp3`
- HP: 3500 | Skade: 90 | Fart: 95 | Skala: 3.2x | Tint: Grønn (0x55ff55)
- **Spesial:** Høy knockback-resistans (0.95). Bruker Wizard-animasjoner.
- **Fase 2:** Spawner minions oftere og etterlater røykskyer.

### Skjelettkongen – *The Undying King* ✅ 💎
- **Etter:** Level 10 | **Musikk:** `Glitch King.mp3`
- HP: 5000 | Skade: 110 | Fart: 80 | Skala: 3.5x
- **Abilities:** Multi-Bone Volley (5 prosjektiler), Mass Raise Dead.
- **Fase 2 trigger:** 40% HP

### Åpne feil / Mangler – Bosser
- 🚧 Bone Volley bruker `scene.add.circle()` (primitiv grafikk) i stedet for et sprite-prosjektil – trenger asset
- 🚧 `boss-spawn-minion`-event er emittet men ikke koblet til MainScene (minions spawner ikke faktisk)

---

## 5. Våpen

Alle 5 våpen er tilgjengelige fra spillstart (ingen kjøpes lenger). Hotkeys 1–5.

| Hotkey | Våpen | Status | Beskrivelse |
| :--- | :--- | :--- | :--- |
| **1** | **Sverd** | ✅ | Melee. Blokkering (høyreklikk) reduserer skade 80%. |
| **2** | **Bue** | ✅ | Ranged. Pilhastighet 700px/s. |
| **3** | **Ildkule** | ✅ | Magic. AoE eksplosjon, 80px splash. |
| **4** | **Frostbolt** | ✅ | Magic. Bremser fiender. Splash 100px. |
| **5** | **Lyn** | ✅ | Homing-bolt. Kjedeblinker til nye mål. |
| **Shift**| **Dash** | ✅ | Rask unnamanøver. |
| **[2-4]** | **Klasse-Evner** | ✅ | Tre unike evner per klasse (se Seksjon 13). Hotbar-layout varierer per klasse. |

### Åpne feil – Våpen
- ⚠️ **Bue krasjer** spillet ved treff med Eksplosive Piler aktivert
- ⚠️ **Movement lock** ved bue/spell er for lang – behøver reduksjon
- ⚠️ **Lyn er for kraftig** – for nøyaktig seeking, for lite miss-sjanse
- ⚠️ **Multicast lyn** (`Stormskudd`) sender alle bolter mot samme mål istedenfor å spre seg
- ❌ **Cooldown-hjul** (WoW-stil overlay på hotbar) er ikke implementert – er planlagt

---

## 6. Oppgraderinger (The Merchant)

Prisformel: `kostnad = basePrice × (currentLevel ^ priceScale)` (eksponentiell skalering).

### Karakter
| ID | Navn | Effekt per Lvl | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `health` | Vitalitet | +20 Maks HP | 20 | 40 | ✅ |
| `speed` | Lynrask | +10 Bevegelseshastighet | 10 | 50 | ✅ |
| `regen` | Trollblod | +1 HP/sek regen | 10 | 100 | ✅ (Nå med tick i loop) |
| `armor` | Jernhud | +1 Skade-reduksjon | 10 | 75 | ✅ |
| `dash_cooldown`| Vindstøt | -20% dash-cooldown | 6 | 80 | ✅ |
| `dash_distance`| Lynskritt | +50px dash-distanse | 5 | 100 | ✅ |
| `dash_lifesteal`| Blodsug | +5 HP healing ved dash| 3 | 180 | ✅ |

### Sverd
| ID | Navn | Effekt per Lvl | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `damage` | Skarpt Stål | +10% Skade | 20 | 60 | ✅ |
| `knockback` | Tungt Slag | +15% Knockback | 10 | 50 | ✅ |
| `attack_speed` | Berserk | +10% Angrepsfart | 10 | 80 | ✅ |

### Bue
| ID | Navn | Effekt per Lvl | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bow_cooldown` | Rask Trekking | -10% Ladetid | 10 | 60 | ✅ |
| `multishot` | Flerskudd | +1 Pil per skudd | 5 | 250 | ✅ |
| `pierce` | Gjennomboring | Piler går gjennom +1 fiende | 3 | 300 | ⚠️ Stat settes i registry; arrow-klassen krasjer |
| `arrow_damage` | Skarpere Piler | +15% Pilskade | 8 | 80 | ✅ |
| `arrow_speed` | Lynrask Pil | +20% Pilhastighet | 5 | 70 | ✅ |
| `explosive_arrow` | Eksplosive Piler | Piler eksploderer ved treff | 3 | 400 | ⚠️ Logikk eksisterer, men trigger krasj ved treff |

### Magi – Ildkule
| ID | Navn | Effekt per Lvl | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `fire_damage` | Brannskade | +15% Ildkule-skade | 10 | 70 | ✅ |
| `fire_radius` | Eksplosiv Kraft | +20px eksplosionsradius | 5 | 120 | ✅ |
| `fire_speed` | Lynild | +15% Prosjektilhastighet | 8 | 80 | ✅ |
| `fire_chain` | Kjedereaksjon | Sekundær eksplosjon etter 300ms | 3 | 300 | ✅ |

### Magi – Frost
| ID | Navn | Effekt per Lvl | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `frost_damage` | Iskald Makt | +15% Froststav-skade | 10 | 70 | ✅ |
| `frost_radius` | Frysebølge | +20px frysningsradius | 5 | 120 | ✅ |
| `frost_slow` | Permafrost | Fiender bremses lengre | 5 | 150 | ✅ |
| `frost_shatter` | Isknusing | Frosne fiender tar extra skade og splintrer | 3 | 350 | ✅ |

### Magi – Lyn
| ID | Navn | Effekt per Lvl | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `lightning_damage` | Tordenstyrke | +15% Lynstav-skade | 10 | 70 | ✅ |
| `lightning_bounces` | Kjedeblunk | +1 ekstra mål å hoppe til | 5 | 200 | ✅ |
| `lightning_multicast` | Stormskudd | +1 lyn avgitt samtidig | 3 | 300 | ⚠️ Bolter overlapper – sprer seg ikke |
| `lightning_stun` | Statisk utladning | +10% sjanse til stun | 5 | 150 | ✅ 💎 |
| `lightning_voltage`| Høyspenning | +15% skade per bounce | 3 | 200 | ✅ 💎 |

> **❌ Fjernet siden v1.2:** `Bueskytter`-oppgraderingen (alle våpen er nå fra start). `Magnet`-oppgraderingen (hardkodet radius 150px, skalering ikke implementert, tatt ut av butikken).

### Spesial-oppgraderinger 💎
| ID | Navn | Effekt | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- |
| `bow_singularity`| Singularitetspil | Piler skaper gravitasjonsfelt | 1000 | ✅ |
| `poison_arrow` | Giftpil | Piler forgifter fiender | 500 | ✅ |
| `magic_soul_link`| Sjelelenke | Fiender deler 40% skade | 1500 | ✅ |
| `sword_eclipse` | Solsnu | Sverdsving etterlater mørk sti | 1200 | ✅ |

### Synergier 💎
| ID | Navn | Krav | Effekt | Status |
| :--- | :--- | :--- | :--- | :--- |
| `thermal_shock` | Thermal Shock | Fire Dmg 3 + Frost Slow 3 | Konsumerer frys for 3x eksplosjon | ✅ |

---

## 7. Spill-flyt (The Loop)

```
Start/Fortsett → Overlevelse (bølger) → Loot gull → Shop → [Vanlig level fullført]
              ↓
          Boss-splash → Boss-fight → Boss beseiret → Neste vanlige level
              ↓
         [Avslutt spill] → Forsiden (run lagret, kan fortsettes)
```

1. **Start / Fortsett:** Landing Page viser «Fortsett Spill» hvis det finnes en lagret run, og «Nytt Spill» som sekundærvalg. Uten lagret run vises kun «Start Spill». ✅
2. **Overlevelse:** Bekjemp bølger av fiender – antall og styrke skalerer med niveau.
3. **Loot:** Samle gullmynter fra falne fiender (5–15 base, +3 per ekstra level).
4. **Shopping:** Bruk gull i butikken mellom bølger/levels for å bli sterkere.
5. **Victory:** Fullfør alle bølgene på et kart → full HP → neste miljø/boss.
6. **Bossfight:** Eget musikksporet, splash screen, og dedikert HP-bar.
7. **Avslutt midt i spillet:** «Avslutt spill»-knappen i boken (nederst til venstre, under venstre side av boken) lagrer run og tar spilleren til forsiden. ✅

### 7.1 Run-progresjon (Autosave) ✅

Run-tilstand lagres automatisk til `localStorage` (`kringsringen_run_v1`) på fire tidspunkter:

| Tidspunkt | Utløser | Fiendeposisjon lagret? |
| :--- | :--- | :--- |
| Wave-start | `WaveManager.startWave()` | ❌ kun registry |
| Level fullført | `level-complete`-handler i `MainScene` | ❌ kun registry |
| Avslutt til meny | «Avslutt spill»-knappen → `collectSaveData()` | ✅ |
| Nettleserlukking | `window.beforeunload` → `collectSaveData()` | ✅ |

Wave-start og level-complete lagrer kun registry-tilstand (wave-teller, coins). Full-fidelity-lagring – med fiendeposisjon og spillerposisjon – skjer bare ved bevisst avslutting eller nettleserlukking.

**Hva lagres:**

| Felt | Beskrivelse |
| :--- | :--- |
| `gameLevel` | Nivå man er på |
| `currentWave` | Bølge man er på |
| `playerCoins` | Gull samlet denne runnen |
| `upgradeLevels` | Alle oppgraderinger kjøpt denne runnen |
| `currentWeapon` | Aktivt våpen |
| `unlockedWeapons` | Våpen tilgjengelig |
| `playerHP` / `playerMaxHP` | HP på lagringstidspunkt |
| `playerX` / `playerY` | Spillerens posisjon i verdenskoordinater (valgfri) |
| `savedEnemies` | Levende fiender med posisjon, type og HP (valgfri) |
| `waveEnemiesRemaining` | Antall fiender som gjenstår å spawne i bølgen (valgfri) |

**Sletting av lagret run:**
- Spilleren dør og trykker «Prøv Igjen» → run slettes; ny run starter fra level 1
- Spilleren velger «Nytt Spill» fra forsiden → run slettes eksplisitt

> **Merk:** Når spilleren fortsetter, gjenopprettes fiender til sine lagrede posisjoner og HP-verdier hvis `savedEnemies` er tilgjengelig (skjer ved avslutting eller nettleserlukking). Ved wave-start-lagringer starter bølgen på nytt uten lagrede fiender. Se [`docs/save_system.md`](./save_system.md) for full teknisk dokumentasjon.

---

## 8. Kart og Miljø

Hvert Map Level laster et statisk kart via `StaticMapLoader` + `StaticMapData`. Kart genereres ikke proseduralt lenger.

| Level | Tema | Musikk | Status |
| :--- | :--- | :--- | :--- |
| **1** | Den Grønne Lysningen | meadow_theme | ✅ |
| **2** | De Mørke Stiene | exploration_theme | ✅ |
| **3** | Ulvemarka | dragons_fury | ✅ |
| **4+** | *(Navn mangler)* | *(ikke tildelt)* | 🚧 |

- Kart-radius for fiende-spawn: 800px fra sentrum
- Kart-størrelse: 3000×3000px
- Vær-effekter via `WeatherManager` ✅
- Ambient partikler (fireflies, løv, gnister) via `AmbientParticleManager` ✅
- Dynamisk lysrigg rundt spilleren (3 lys-lag) ✅
- Vignett-effekt som intensiveres etter tap av HP ✅

---

## 9. Audio

| Type | Spor | Status |
| :--- | :--- | :--- |
| BGM – Level 1 | meadow_theme.mp3 | ✅ |
| BGM – Level 2 | exploration_theme.mp3 | ✅ |
| BGM – Level 3 | dragons_fury.mp3 | ✅ |
| BGM – Level 4+ | *(ingen tildeling)* | ⚠️ Mangler |
| BGM – Boss 1 & 3 | Final Dungeon Loop.mp3 | ✅ |
| BGM – Boss 2 | Glitch King.mp3 | ✅ |
| BGS – Skog | forest_day.wav | ⚠️ Volum for lav |
| SFX – Sverd | sword_attack + sword_impact | ✅ |
| SFX – Bue | bow_attack + bow_impact | ✅ |
| SFX – Ild/Frost/Lyn | fireball_cast/hit, ice_freeze/throw | ✅ |
| SFX – Mynter | coin_collect | ✅ |
| SFX – Footsteps | dirt_run (5 varianter) | ✅ |
| SFX – UI | ui_click, paper_move | ✅ |

---

## 10. Kjente Bugs (Åpne)

| # | Beskrivelse | Prioritet |
| :--- | :--- | :--- |
| B1 | **Spillet krasjer** ved bue-treff med Eksplosive Piler aktivert | ✅ Fikset |
| B2 | **Movement lock** ved bue og spells er for lang | Høy |
| B3 | **Lyn er for kraftig** – for liten sjanse til å bomme | Høy |
| B4 | **Multicast lyn** sender alle bolter til samme mål istedenfor å spre seg | Høy |
| B5 | **Cooldown-hjul** på hotbar (WoW-stil) mangler | Medium |
| B6 | **Musikk bytter ikke** etter Level 3 (Level 4+ bruker feil spor) | Medium |
| B7 | **Ambient-volum** (forest_day) er for lavt | Lav |
| B8 | **boss-spawn-minion**-event er ikke koblet i MainScene | ✅ Fikset |
| B9 | **Trollblod** (HP-regen) har ingen game-loop-tick | ✅ Fikset |
| B10 | **Kjedereaksjon / Isknusing** mangler logikk | ✅ Fikset |
| B11 | **Input-lock etter innlasting** | ⚠️ Delvis |

---

## 10.1 Fikset Bugs

| # | Beskrivelse | Fiks | Dato |
| :--- | :--- | :--- | :--- |
| F1 | **Uendelig lasteskjerm** ved "Fortsett Spill" – `create-complete` ble aldri emittet hvis `MainScene.create()` kastet exception | Try-catch-finally rundt hele `create()`, garanterer `create-complete` alltid fyres | 2025-03-01 |
| F2 | **WaveManager tilbakestilte bølge** – `startLevel()` hardkodet `currentWave = 1`, overskrev lagret bølgenummer | `startLevel(level, startAtWave = 1)` respekterer lagret wave | 2025-03-01 |
| F3 | **Uendelig lasteskjerm v2** ved "Avslutt spill" → "Fortsett Spill" (uten F5) – Phaser `game.destroy()` er asynkron, ny instans kolliderte med gammel | `game.loop.stop()` synkront før destroy, ghost-cleanup i `createGame()`, `PreloadScene` byttet til native `setTimeout()` | 2026-03-01 |

---

## 11. Planlagte Features (Backlog)

### 11.1 Høy Prioritet
- 🚧 **Cooldown-hjul på hotbar** – roterende sektor-overlay à la WoW, vises for alle 5 slots
- 🚧 **Lyn-balansering** – legg til miss-sjanse (20–30%), spre multicast i ulike retninger
- 🚧 **Bue-krasj fix** – feil ved eksplosiv pil-kollisjon i arcade physics overlap
- 🚧 **Trollblod game-loop** – timelbasert HP-regen hvert sekund i `MainScene.update()`
- 🚧 **Boss minion-spawning** – koble `boss-spawn-minion`-event i MainScene

### 11.2 Innhold – Nivåer
- 🚧 **Level 4 navn og tema** – definer visuell identitet og musikk
- 🚧 **Level 4-5 musikk** – tildel spor i `WaveManager.startLevel()`
- 🚧 **Varierte kart per level** – ulike static maps per tema

### 11.3 Innhold – Oppgraderinger
- 🚧 **Kjedereaksjon** (fire_chain) – implementer antennelse-logikk i Fireball-kollisjon
- 🚧 **Isknusing** (frost_shatter) – fiender i frossen tilstand tar +50% skade og splintrer
- 🚧 **Magnet** – gjeninnfør med faktisk skalering i Coin pickup-radius

### 11.4 Innhold – Fiender / Bosser
- 🚧 **Miniboss-system** – mellomboss mellom vanlige waves (ikke eget boss-level)
  - *Slime King:* Etterlater slimspor, dropper 50–100 gull
  - *Skeleton Captain:* Kan blokkere piler med skjold
  - *Elite Orc Crusher:* Shockwave-angrep (liten AoE)
- 🚧 **Bone Volley sprite** – erstatt `scene.add.circle()` med eget prosjektil-sprite

### 11.5 Gameplay-systemer
- 🚧 **Inventory/utstyrssystem** – eksisterende `PerkCard`-komponent kan utvides
- 🚧 **Quests/Challenges** – sekundære mål per level (f.eks. «Drep 20 fiender uten å bli truffet»)
- 🚧 **Powerups på kart** – midlertidige power-ups som spawner på bakken (speed boost, skjold, HP-orb)
- 🚧 **Faser per map/level** – ulike spawnsoner eller hendelser innen ett level

---

## 12. Egne Forslag til Ekspansjon og Finpuss

### 12.1 Spillfølelse («Game Feel»)
- **Skjerm-shake** ved boss-angrep og egne eksplosioner – Phaser har innebygd camera shake
- **Hit-stopp** (2–4 frames freeze) når spilleren treffes av tunge angrep (Armored Orc, boss)
- **Kombo-teller** synlig på skjermen som forsvinner etter 3s inaktivitet – gir mental feedback
- **Kritisk treff-indikator** – eksisterende `baseCritChance`-stat brukes ikke visuelt; legg til gul/oransje skadetekst og lyd

### 12.2 Visuell Polering
- **Boss death-sekvens** – slow-motion + partikkeleksplosjon i stedet for at bosset bare forsvinner
- **Level-up flash** ved oppgradering – kamerablink + lydeffekt
- **Fiende-varianter** – tints på eksisterende sprites (f.eks. rød Orc-variant på høye levels)
- **Spor etter slime** – enkle decal-sprites bak Slime som forsvinner etter 3s, gir karakter til den ellers mest generiske fienden

### 12.3 Audio
- **Dynamisk musikkmiks** – skill mellom rolig og intens variant av samme spor avhengig av antall fiender på skjermen (Phaser Audio API støtter crossfade)
- **Posisjonell lyd** – SFX med stereo-panning basert på fiendenes posisjon relativt til spilleren
- **Boss voice line** – ett enkelt lydsøk ved boss splash («NONE SHALL PASS» e.l.) gir øyeblikkelig identitet

### 12.4 UI / UX
- **Cooldown-tall** i hotbar-slotet (sekunder igjen) som supplement til hjulet
- **Minimap** (enkel, lav-res) øverst i høyre hjørne som viser fiende-punkter – særlig nyttig i levels 4–5 med høyere antall
- **Skade-statistikk etter bølge** – enkel popup («Wave Clear! Du drepte 12 fiender, tok 45 skade») gir korttids-feedback

### 12.5 Progressjon og Replayverdi
- **Hard Mode** – toggle på landing page som øker alle fiende-multiplikatorer med 1.5x og fjerner full-HP-bonus mellom levels
- **Løp-statistikk** – logg per run (total damage dealt, highest combo, coins earned) lagret lokalt; vises i HighscoresModal
- **Daglige utfordringer** (Daily Challenges) via Firebase – et seed-basert modifikatorsett som endres daglig (f.eks. «Kun Frost tillatt», «Alle fiender er 2x raskere»)
- **Ulåsbare startbonuser** – etter en fullført run låser man opp ett av tre startvalg (f.eks. +50 gull start, eller 1 gratis Skarpt Stål nivå) for neste run

> ✅ **Implementert (2026-02-28):** Run-progresjon lagres automatisk i cache – se seksjon 7.1.

---

---

## 13. Klassesystem (Classes) ✅

Spilleren velger én av **fire klasser** ved start av en ny run. Hver klasse har unike stats, startvåpen, egne shop-kategorier og tre klasse-evner (Hotkey 2–4) som kan oppgraderes under klassens eksklusive kategorier i butikken.

### 🛡️ Krieger (Melee Warrior)
- **Identitet:** Nærkamps-spesialist, høy HP, tung knockback.
- **Start-stats:** +30% HP, +20% Damage, +2 Armor, -5% Speed.
- **Startvåpen:** Sverd (Hotkey 1).
- **Shop-kategorier:** SVERD, RUSTNING, KARAKTER.

| Hotkey | Evne | Beskrivelse |
| :--- | :--- | :--- |
| **2** | **Whirlwind Slash** | 3s roterende AoE-angrep (120px radius). 15 skadetikk à 200ms. CD: 8s (skalerer med `whirl_cooldown`). |
| **3** | **Iron Bulwark** | Hexagonal skjoldaura i 5s. Visuell kjøring, ingen skade. CD: 12s. |
| **4** | **Chain Grapple** | Trekker alle fiender innen 400px til seg. AoE-ring + kjedegrafik. CD: 10s. |

### 🏹 Archer (Ranged Specialist)
- **Identitet:** Rask, fragil, kontroll over piler. 2 dash-ladinger (base).
- **Start-stats:** +25% Speed, +15% Damage, +15% Atk Speed, -10% HP.
- **Startvåpen:** Bue (Hotkey 1).
- **Shop-kategorier:** BUE, SMIDIGHET, KARAKTER.

| Hotkey | Evne | Beskrivelse |
| :--- | :--- | :--- |
| **2** | **Phantom Volley (Fantombyge)** | 15–25 piler avfyrt over 1.5s mot musepeker. Lav skade per pil (0.35×). CD: 12s. |
| **3** | **Vault & Volley** | Hopp 180px bakover + avfyr 5 piler i vifte. CD: 7s. |
| **4** | **Shadow Decoy** | Spawner en lokkefugl-klon i 1.5s. Spiller halvgjennomsiktig. CD: 15s. |

### 🧙 Wizard (Magic User)
- **Identitet:** Magisk mestring, elemental kontroll.
- **Start-stats:** +25% Damage, +10% Atk Speed, -20% HP.
- **Startvåpen:** Ildkule (Slot 1), Frostbolt (Slot 2), Chain Lightning (Slot 3).
- **Shop-kategorier:** ILDMAGI, FROSTMAGI, TORDENMAGI, EVNER, SYNERGI, KARAKTER.

| Hotkey | Evne | Beskrivelse |
| :--- | :--- | :--- |
| **4** | **Arcane Cascade** | Spawner en Singularity (tyngdefelt) ved musepeker i 3–4.5s. Kollapser i eksplosjon. CD: 12s. |

### 🎵 Skald (Battle Bard) ✅
- **Identitet:** Rytmisk kamp — bygger opp Vers-ressurs ved angrep som låser opp kraftige Kvad-utbrudd.
- **Start-stats:** +10% HP, +5% Damage, +10% Speed, +1 Armor.
- **Startvåpen:** Harpe-boltprosjektil (Slot 1, `harp_bolt`).
- **Shop-kategorier:** KVAD, RYTME, KARAKTER.
- **Ressurs:** **Vers** – fem ladinger (♦♦♦♦♦). Bygges opp ved Resonanspuls-angrep (hotkey `2`). Passive bonuser: 1 Vers → +15% SPD, 2 → +15% ATK, 3 → +20% DMG, 4 → +20% CRIT. Vises i `VersIndicator`-komponenten over Hotbar.

| Hotkey | Evne | Kost | Beskrivelse |
| :--- | :--- | :--- | :--- |
| **1** | **Harp Bolt** | — | Sølv-blå SonicBolt. Rask spam-attack (400ms CD, 0.6× dmg). Baseline DPS-våpen. |
| **2** | **Resonanspuls** (Ability) | — | Gull SonicBolt-prosjektil. Bygger +1 Vers per cast (maks 5). CD: 1200ms (skaleres med attack speed). Høyere skade (1.1×) enn Harp Bolt. Strategisk ressurs-builder. Hver Vers gir passive bonuser. |
| **3** | **Inspirerende Kvad** | 2 Vers | Healer 30–50 HP + gir **+25% skade og +25% fart** i 5–8s (oppgraderbar varighet). CD: 8s. Kombinerer healing med kraftig combat-buff. |
| **4** | **Seierskvad** | 5 Vers | Massiv AoE-burst (2.5× skade, 200px+ radius) + stun + opptil 4 ekko-tikk (m/ `ekko`-oppgradering). CD: 20s. Koster 4 Vers med `krigsbarde`-oppgradering. Kan gi lifesteal med `blodkvad` og damage buff med `anthem_of_fury`. |

> **SonicBolt** (`src/game/SonicBolt.ts`): Musikalsk prosjektil med Add-blandmodus, pulserende skala-animasjon og prosedyralt musikknotegrafik. Visuelt differensiert: Harp Bolt (sølv-blå, lett trail) vs Resonanspuls (gull, tett trail). Kan piercer og påføre slow (via `stridssang_slow`-oppgradering). ✅

**Skald Upgrades:**
- **KVAD-kategorien:** Harpe damage/speed/pierce, Resonanspuls damage/pierce, Seierskvad radius/ekko, Inspirerende Kvad varighet, Vers-scaling (`vers_damage`), Blodkvad (Seierskvad lifesteal), Krigsbarde (reduserer Seierskvad-kost til 4 Vers)
- **RYTME-kategorien:** Stridssang slow, Harpe lifesteal, Resonansskjold (damage reduction ved maks Vers), Crescendo (attack speed per Vers), Anthem of Fury (Seierskvad gir damage buff)
- Se `src/config/class-upgrades.ts` for fullstendig liste og balanseverdier. ✅

---

**Dokumentversjon:** 2.6
**Sist oppdatert:** 6. mars 2026
**Ansvarlig AI Architect:** Antigravity
