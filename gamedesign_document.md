# Kringsringen – Game Design Document (GDD)

Dette dokumentet beskriver spillmekanikken, fremgangen og det planlagte innholdet for **Kringsringen**.

> **Dokumentversjon:** 2.0
> **Sist oppdatert:** 2026-02-24
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

> **⚠️ Musikk:** Level 4+ mangler manuell musikktildeling i `WaveManager.startLevel()`. Bare level 2 og 3 bytter musikk. Levels 1, 4, 5 spiller det som var fra før.

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

> *Alle stats er base-verdier og skaleres med niveau-multiplikatoren.*

### Åpne feil – Fiender
- ⚠️ **Slime angriper ikke** med animasjon; de skader spilleren ved å bevege seg inn i dem.

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

### Åpne feil / Mangler – Bosser
- 🚧 Bone Volley bruker `scene.add.circle()` (primitiv grafikk) i stedet for et sprite-prosjektil – trenger asset
- 🚧 `boss-spawn-minion`-event er emittet men ikke koblet til MainScene (minions spawner ikke faktisk)

---

## 5. Våpen

Alle 5 våpen er tilgjengelige fra spillstart (ingen kjøpes lenger). Hotkeys 1–5.

| Hotkey | Våpen | Status | Beskrivelse |
| :--- | :--- | :--- | :--- |
| **1** | **Sverd** | ✅ | Melee, svinganimert. Blokkering (høyreklikk) reduserer skade 80%. |
| **2** | **Bue** | ⚠️ Bug | Ranged, 700px/s pilhastighet. Støtter multishot og gjennomboring (se bugs). |
| **3** | **Ildkule** | ✅ | Magic, AoE eksplosjon, 80px splash. |
| **4** | **Frostbolt** | ✅ | Magic, bremser fiender. Splash-radius 100px. |
| **5** | **Lyn** | ⚠️ Balanse | Homing-bolt, kjedeblinker til nye mål. Meget kraftig. |

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
| `regen` | Trollblod | +1 HP/sek regen | 10 | 100 | ⚠️ Registret settes, men regen-tick i game loop mangler |
| `armor` | Jernhud | +1 Skade-reduksjon | 10 | 75 | ✅ |

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
| `fire_chain` | Kjedereaksjon | Eksplosjon setter fyr på nærliggende fiender | 3 | 300 | 🚧 Kjøpbar, effekten ikke implementert |

### Magi – Frost
| ID | Navn | Effekt per Lvl | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `frost_damage` | Iskald Makt | +15% Froststav-skade | 10 | 70 | ✅ |
| `frost_radius` | Frysebølge | +20px frysningsradius | 5 | 120 | ✅ |
| `frost_slow` | Permafrost | Fiender bremses lengre | 5 | 150 | ✅ |
| `frost_shatter` | Isknusing | Frosne fiender tar +50% skade og splintrer | 3 | 350 | 🚧 Kjøpbar, effekten ikke implementert |

### Magi – Lyn
| ID | Navn | Effekt per Lvl | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `lightning_damage` | Tordenstyrke | +15% Lynstav-skade | 10 | 70 | ✅ |
| `lightning_bounces` | Kjedeblunk | +1 ekstra mål å hoppe til | 5 | 200 | ✅ |
| `lightning_multicast` | Stormskudd | +1 lyn avgitt samtidig | 3 | 300 | ⚠️ Bolter overlapper – sprer seg ikke |

> **❌ Fjernet siden v1.2:** `Bueskytter`-oppgraderingen (alle våpen er nå fra start). `Magnet`-oppgraderingen (hardkodet radius 150px, skalering ikke implementert, tatt ut av butikken).

---

## 7. Spill-flyt (The Loop)

```
Start → Overlevelse (bølger) → Loot gull → Shop → [Vanlig level fullført]
      ↓
  Boss-splash → Boss-fight → Boss beseiret → Neste vanlige level
```

1. **Start:** Spilleren starter med 0 gull og alle 5 våpen tilgjengelig.
2. **Overlevelse:** Bekjemp bølger av fiender – antall og styrke skalerer med niveau.
3. **Loot:** Samle gullmynter fra falne fiender (5–15 base, +3 per ekstra level).
4. **Shopping:** Bruk gull i butikken mellom bølger/levels for å bli sterkere.
5. **Victory:** Fullfør alle bølgene på et kart → full HP → neste miljø/boss.
6. **Bossfight:** Eget musikksporet, splash screen, og dedikert HP-bar.

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
| B1 | **Spillet krasjer** ved bue-treff med Eksplosive Piler aktivert | Kritisk |
| B2 | **Movement lock** ved bue og spells er for lang | Høy |
| B3 | **Lyn er for kraftig** – for liten sjanse til å bomme | Høy |
| B4 | **Multicast lyn** sender alle bolter til samme mål istedenfor å spre seg | Høy |
| B5 | **Cooldown-hjul** på hotbar (WoW-stil) mangler | Medium |
| B6 | **Musikk bytter ikke** etter Level 3 (Level 4+ bruker feil spor) | Medium |
| B7 | **Ambient-volum** (forest_day) er for lavt | Lav |
| B8 | **boss-spawn-minion**-event er ikke koblet i MainScene (minions spawner ikke) | Medium |
| B9 | **Trollblod** (HP-regen) har ingen game-loop-tick – effekten er kjøpbar men passiv | Medium |
| B10 | **Kjedereaksjon** (fire_chain) og **Isknusing** (frost_shatter) er kjøpbare men uten effekt | Medium |

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

---

**Dokumentversjon:** 2.0
**Ansvarlig AI Architect:** Antigravity
