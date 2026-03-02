# CLASS SYSTEM – DETALJERT INNHOLDSPLAN
> **Revisjoner (2026-03-02):** Wizard hotkeys [1-3] + Cascade [4] · Krieger fart -5% · Archer 2 dash-ladinger bekreftet
## Feature Audit: Alle Upgrades, Abilities, Visuals og UX

> **Grunnlag:** Basert på `class-system-design.md`, `gamedesign_document.md`, `upgrades.ts` og `weapons.ts`.
> **Eksisterende upgrade-schema:** `UpgradeConfig { id, title, icon, category, maxLevel, basePrice, priceScale, description, iconTint?, requires? }`

---

## FASE 0: «WHY» – INTENSJONALITET

**Problem denne featuren løser:**
- Alle klasser bruker nøyaktig de samme 73 oppgraderingene → ingen builds, ingen identitet
- Ingen grunn til å spille igjennom mer enn én gang
- Shopkategori-navnene passer ikke til den karakteren man spiller

**Det vi IKKE bygger:**
- Komplisert ability-rotation system (scope creep) – 3 klasser, 1 aktiv ability hver holder designet rent
- Skill trees med dependencies-web – for lite gjennomspillingstid til at det betaler seg
- Visuelt nye sprites per klasse – bruker tint på existing player sprite

**Intensjonal minimalism:** Hvert element i dette dokumentet løser enten *class fantasy*, *upgrade diversity*, eller *replayability*. Ingenting annet.

---

## DEL 1: FULL UPGRADE-KATALOG

### 1.1 SHARED UPGRADES – «KARAKTER» (Alle klasser ser alle)

Disse er *identiske* for alle tre klasser. Eksisterende upgrades + 2 nye.

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale |
|---|---|---|---|---|---|---|
| `health` | Vitalitet | `item_heart_status` | +20 Maks HP | 20 | 40 | 1.5 |
| `speed` | Lynrask | `item_lightning` | +10 Fart | 10 | 50 | 1.6 |
| `regen` | Trollblod | `item_potion_red` | +1 HP/sek | 10 | 100 | 1.8 |
| `armor` | Jernhud | `item_shield` | +1 Rustning | 10 | 75 | 1.7 |
| `dash_cooldown` | Vindstøt | `item_lightning` | -20% dash CD | 6 | 80 | 1.7 |
| `dash_distance` | Lynskritt | `item_lightning` | +50px dash | 5 | 100 | 1.8 |
| `dash_lifesteal` | Blodsug | `item_potion_red` | +5 HP ved dash | 3 | 180 | 2.0 |
| `coin_magnet` *(NY)* | Gullmagneten | `item_coin` | +50px myntradius | 5 | 90 | 1.6 |
| `crit_chance` *(NY)* | Skarpeskytte | `item_swords_crossed` | +5% krit-sjanse | 6 | 120 | 1.9 |

> **Rationale:** `coin_magnet` gjeninnføres nå RIKTIG med faktisk radius-skalering (var hardkodet 150px og tatt ut). `crit_chance` aktiverer eksisterende `baseCritChance`-stat visuelt.

---

### 1.2 KRIEGER – KATEGORI: DRIVKRAFT ⭐

Legendære Krieger-oppgraderinger og Whirlwind Slash evne-nivåer.

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale | Krav |
|---|---|---|---|---|---|---|---|
| `whirl_damage` | Skarpe Kniver | `item_sword` | +25% Virvelvind-skade | 3 | 200 | 2.2 | – |
| `whirl_cooldown` | Rotasjonsfart | `item_swords_crossed` | -20% Virvelvind-CD | 3 | 250 | 2.5 | `whirl_damage` lv1 |
| `whirl_chain` | Eksplosiv Sekvens | `item_swords_crossed` | Hvert treff -5% CD (opptil -30%) | 2 | 500 | 2.8 | `whirl_cooldown` lv2 |
| `berserker_rage` | Berserkerfurie | `item_sword_heavy` | +5% skade per 20% HP tapt | 3 | 300 | 2.5 | – |
| `livsstaling` | Livsstaling | `item_potion_red` | +8 HP ved hvert fiendedrap (melee) | 4 | 200 | 2.0 | – |
| `blodust` | Blodtorne | `item_shield` | Fiender som treffer deg tar 15% av skaden | 3 | 350 | 2.8 | `armor` lv3 |

> **Visuell behandling:** `iconTint: 'drop-shadow(0 0 5px #cc4400) hue-rotate(-10deg)'` (rødoransje legendarisk glød)

---

### 1.3 KRIEGER – KATEGORI: MASTRING ⭐ (Sverd-fokus)

Erstatter gammel «Sverd»-kategori, men kun for Krieger.

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale |
|---|---|---|---|---|---|---|
| `damage` | Skarpt Stål | `item_sword` | +10% Skade | 20 | 60 | 1.5 |
| `knockback` | Tungt Slag | `item_sword_heavy` | +15% Knockback | 10 | 50 | 1.4 |
| `attack_speed` | Berserk | `item_swords_crossed` | +10% Angrepsfart | 10 | 80 | 1.6 |
| `sword_eclipse` | Solsnu | `item_sword` | Sverd etterlater mørk sti (30% ekstraskade) | 3 | 1200 | 2.2 |
| `wide_swing` *(NY)* | Bred Svingning | `item_sword` | +30% svingebue (treffer bredere AoE) | 3 | 180 | 2.0 |
| `heavy_momentum` *(NY)* | Tyngdekraft | `item_sword_heavy` | Hvert sverd-hit øker neste hits skade +10% (max 3 stacks) | 3 | 250 | 2.3 |

---

### 1.4 KRIEGER – KATEGORI: KAMPTALENT ⭐ (Battle-teknikker)

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale | Krav |
|---|---|---|---|---|---|---|---|
| `counter_strike` *(NY)* | Kontraangrep | `item_swords_crossed` | 20% sjanse å returnere 25% av mottatt skade | 3 | 300 | 2.5 | `armor` lv2 |
| `stomp` *(NY)* | Stormtramp | `item_sword_heavy` | Etter dash: mini-AoE stun 0.5s rundt spilleren | 2 | 400 | 3.0 | `dash_cooldown` lv2 |
| `battle_cry` *(NY)* | Krigsrop | `item_swords_crossed` | Drep 5 fiender → +15% skade i 8s (Krigsrush) | 3 | 280 | 2.4 | – |
| `executioner` *(NY)* | Bøddel | `item_sword` | +50% skade mot fiender under 25% HP | 2 | 450 | 2.8 | `damage` lv5 |

---

### 1.5 KRIEGER – KATEGORI: RUSTNING ⭐ (Defense-synergier)

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale | Krav |
|---|---|---|---|---|---|---|---|
| `skadeskalering` *(NY)* | Skadeskalering | `item_shield` | +5% skade per rustnings-nivå kjøpt | 3 | 220 | 2.2 | `armor` lv3 |
| `utstotbar_slag` *(NY)* | Utstøtbar Slag | `item_sword_heavy` | Knockback kjedereagerer – fiender treffer hverandre og tar 40% ekstraskade | 2 | 500 | 3.0 | `knockback` lv5 |
| `iron_will` *(NY)* | Jernvilje | `item_shield` | Overlev ett dødelig angrep med 1 HP (1 gang per level) | 1 | 800 | 1.0 | `armor` lv6 |
| `fortification` *(NY)* | Befestning | `item_shield` | Stå stille 2s: +20% rustning passivt | 3 | 200 | 2.0 | – |

---

### 1.6 ARCHER – KATEGORI: DRIVKRAFT ⭐

Explosive Shot ability-nivåer og unike Archer-legendaries.

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale | Krav |
|---|---|---|---|---|---|---|---|
| `exp_shot_radius` | Massiv Eksplosjon | `item_bow` | +40px eksplosjonradius på Explosive Shot | 3 | 220 | 2.3 | – |
| `exp_shot_damage` | Dødelig Nøyaktighet | `item_bow` | +30% skade-multiplikator på Explosive Shot | 3 | 250 | 2.5 | `exp_shot_radius` lv1 |
| `kaskade_fyring` | Kaskadefyring | `item_bow` | Explosive Shot-treff spawner 2 ekstra piler | 2 | 550 | 3.0 | `exp_shot_damage` lv2 |
| `rikosjett` | Rikosjett | `item_bow` | Piler spretter til 1 ny fiende etter treff | 3 | 300 | 2.5 | – |
| `fokusert_skudd` | Fokusert Skudd | `item_bow` | Lad bue inn → 2x skade-multiplikator (hold angrepsknapp) | 2 | 500 | 2.8 | `arrow_damage` lv4 |
| `shadeskudd` | Skuddkaskade | `item_bow` | Drepe fiende spawner 1 ekstra pil mot nærmeste | 3 | 280 | 2.3 | `multishot` lv2 |

---

### 1.7 ARCHER – KATEGORI: MASTRING ⭐ (Buekunst)

Basert på eksisterende bue-upgrades, men kun for Archer.

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale |
|---|---|---|---|---|---|---|
| `bow_cooldown` | Rask Trekking | `item_bow` | -10% Ladetid | 10 | 60 | 1.5 |
| `multishot` | Flerskudd | `item_bow` | +1 Pil per skudd | 5 | 250 | 2.5 |
| `pierce` | Gjennomboring | `item_spear` | Piler går gjennom +1 fiende | 3 | 300 | 3.0 |
| `arrow_damage` | Skarpere Piler | `item_bow` | +15% Pilskade | 8 | 80 | 1.8 |
| `arrow_speed` | Lynrask Pil | `item_bow` | +20% Pilhastighet | 5 | 70 | 1.6 |
| `explosive_arrow` | Eksplosive Piler | `item_bow` | Piler eksploderer ved treff | 3 | 400 | 2.5 |
| `bow_singularity` | Singularitetspil | `item_bow` | Piler skaper gravitasjonsfelt | 3 | 1000 | 2.5 |
| `poison_arrow` | Giftpil | `item_bow` | Forgifter fiender (8%/tikk) | 3 | 500 | 2.5 |

---

### 1.8 ARCHER – KATEGORI: TALENTER ⭐ (Presisjon)

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale | Krav |
|---|---|---|---|---|---|---|---|
| `headshot` *(NY)* | Hodeskudd | `item_bow` | +15% krit-sjanse (piler) | 3 | 200 | 2.2 | `crit_chance` lv2 |
| `eagle_eye` *(NY)* | Ørneøye | `item_bow` | +30% pilhastighet, +25% rekkevidde | 3 | 250 | 2.4 | `arrow_speed` lv3 |
| `pindown` *(NY)* | Festepil | `item_spear` | 20% sjanse: pil immobiliserer fiende 1.5s | 3 | 350 | 2.7 | `pierce` lv1 |
| `time_slow_arrow` *(NY)* | Tempopil | `item_bow` | Spesialpil (E-tast) som bremser alle fiender 40% i 3s, 15s CD | 1 | 700 | 1.0 | `eagle_eye` lv2 |

---

### 1.9 ARCHER – KATEGORI: SMIDIGHET ⭐ (Mobilitet)

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale |
|---|---|---|---|---|---|---|
| `luftmobilitet` | Luftmobilitet | `item_lightning` | +1 ekstra dash-lading (opp til 3 totalt) | 2 | 350 | 3.0 |
| `aerial_shot` *(NY)* | Luftskudd | `item_bow` | Skyt mens du dasher: ingen fart-tap ved skyting | 2 | 300 | 2.8 |
| `shadow_step` *(NY)* | Skyggetrinn | `item_lightning` | Etter dash: usynlig i 0.5s (fiender mister target) | 2 | 400 | 3.0 |
| `kite_mastery` *(NY)* | Dragemanøver | `item_lightning` | Drep fiende: øyeblikkelig 20% dash CD refund | 3 | 220 | 2.2 |

---

### 1.10 WIZARD – KATEGORI: DRIVKRAFT ⭐

Elemental Cascade ability-nivåer og Wizard-legendaries.

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale | Krav |
|---|---|---|---|---|---|---|---|
| `cascade_duration` | Magisk Resonans | `item_magic_staff` | +2s Cascade-varighet | 3 | 250 | 2.4 | – |
| `cascade_damage` | Elementær Kraft | `item_magic_staff` | +15% skadebonus under Cascade | 3 | 280 | 2.5 | `cascade_duration` lv1 |
| `cascade_chain` | Kjede Reaksjon | `item_lightning_staff` | Fiende truffet av 2+ trolldomstyper tar +50% ekstraskade | 2 | 600 | 3.0 | `cascade_damage` lv2 |
| `manaring` | Manaring | `item_frost_orb` | Aktiv Cascade gir +25% skade-reduksjon | 2 | 450 | 2.8 | `cascade_duration` lv2 |
| `elementar_overfload` | Elementær Overflod | `item_magic_staff` | Bruk én trolldom: +10% skade på alle andre i 4s | 3 | 320 | 2.6 | – |
| `nullifikasjon` | Magisk Nullifikasjon | `item_frost_orb` | Aktivt kastet trolldom kolliderer med fiendebolt og ødelegger begge | 1 | 900 | 1.0 | `cascade_chain` lv1 |

---

### 1.11 WIZARD – KATEGORI: MASTRING ⭐ (Alle Trolldommer)

Alle eksisterende Magi-upgrades samlet under Wizard alene.

| ID | Effekt Gruppe | MaxLvl | BasePris |
|---|---|---|---|
| `fire_damage` / `fire_radius` / `fire_speed` / `fire_chain` | Ildkule | 10/5/8/3 | 70/120/80/300 |
| `frost_damage` / `frost_radius` / `frost_slow` / `frost_shatter` | Frostbolt | 10/5/5/3 | 70/120/150/350 |
| `lightning_damage` / `lightning_bounces` / `lightning_stun` / `lightning_voltage` | Lynglimt | 10/5/5/3 | 70/200/150/200 |
| `magic_soul_link` | Synergi | 1 | 1500 |
| `massiv_eksplosjon` *(NY)* | Ildkule AoE maks | 2 | 500 |

---

### 1.12 WIZARD – KATEGORI: SYNERGI ⭐ (Trolldomsinteraksjoner)

| ID | Navn (NO) | Ikon | Effekt | MaxLvl | BasePris | Krav |
|---|---|---|---|---|---|---|
| `thermal_shock` | Thermal Shock | `item_synergy_rune` | Konsumerer frys → 3x eksplosjonsskade | 1 | 500 | `fire_damage` lv3 + `frost_slow` lv3 |
| `frozen_lightning` *(NY)* | Frosset Torden | `item_lightning_staff` | Frossede fiender fanget av lyn tar 4x skade + splinter | 1 | 700 | `frost_shatter` lv2 + `lightning_stun` lv3 |
| `blaze_storm` *(NY)* | Ildstorm | `item_magic_staff` | Ild + Lyn på samme mål: 2s brannfelt spawn | 2 | 600 | `fire_chain` lv2 + `lightning_damage` lv5 |
| `absolute_zero` *(NY)* | Absolutt Null | `item_frost_orb` | Fullfryst fiende kan kastes som prosjektil | 1 | 1000 | `frost_slow` lv5 + `cascade_duration` lv2 |

> **`iconTint` for synergi:** `'drop-shadow(0 0 6px #8800ff) hue-rotate(200deg)'` (lila mystisk glød)

---

### 1.13 WIZARD – KATEGORI: ARKAN KUNNSKAP ⭐

| ID | Navn (NO) | Ikon | Effekt/Lvl | MaxLvl | BasePris | PriceScale | Krav |
|---|---|---|---|---|---|---|---|
| `spell_echo` *(NY)* | Trolldomseko | `item_magic_staff` | 15% sjanse: kast trolldom uten CD | 3 | 300 | 2.5 | – |
| `overload` *(NY)* | Overbelastning | `item_lightning_staff` | Treffe 3 fiender med ett kast: neste kast er gratis | 2 | 400 | 2.8 | `spell_echo` lv2 |
| `arcane_insight` *(NY)* | Arkan Innsikt | `item_magic_staff` | Hver 4. kast koster 0 mana (ikke relevant nå) / reduserer CD 30% | 3 | 350 | 2.6 | – |
| `mana_shield` *(NY)* | Manadel | `item_frost_orb` | Ta skade: 30% sjanse å absorbe med CD-reduksjon istedet | 2 | 500 | 3.0 | `armor` lv2 |

---

## DEL 2: CLASS ABILITIES – FULL SPESIFIKASJON

### 2.1 KRIEGER – Virvelvind (Whirlwind Slash)

```
Hotkey:          [2] (bytter ut BUEN som er ubrukt av Krieger)
Trigger:         Trykk [2] → spinner rundt i 0.6s
AoE:             Sirkel rundt spiller, radius 120px base
Damage:          100% av spiller-basis-skade per hit, kan treffe samme fiende 2× (start + slutt av spin)
Knockback:       Høy: alle trufne fiender kastes utover
Cooldown:        8s base
Visual:          Roterende blade-particle-effekt (hvitt/grå)  →  Phaser particle emitter med `rotate`
Audio:           `whirlwind_cast.mp3` (ny SFX trenger) + `sword_attack` gjenbrukt
```

**Leveling:**

| Nivå (via shop) | `whirl_damage` | `whirl_cooldown` | `whirl_chain` |
|---|---|---|---|
| Base | 100% skade, 8s CD, 120px | – | – |
| Damage lv1 | 125% | – | – |
| Damage lv2 | 150% | – | – |
| Damage lv3 | 175% | – | – |
| Cooldown lv1 | – | 6.4s | – |
| Cooldown lv2 | – | 5.1s | – |
| Cooldown lv3 | – | 4.1s | – |
| Chain lv1 | – | – | Hvert treff → -5% CD (maks -25%) |
| Chain lv2 | – | – | Hvert treff → -7% CD (maks -35%) |

**Pre-Mortem:** Kan Whirlwind trigges i hop/dash-frames og gi doble effekter? → Legg inn `isWhirlwinding`-flagg som blokkerer ny trigger.

---

### 2.2 ARCHER – Eksplosivt Skudd (Explosive Shot)

```
Hotkey:          [1] (overlay på normal bue → modifiserer NESTE pil)
Trigger:         Trykk [1] → neste bue-skudd er "Explosive Shot"
Visual signal:   Pil-siluetten i hotbar får rødoransje puls-animasjon i ~3s (eller til skutt)
Cooldown start:  Kun ved skyting (= 12s base etter skutt)
AoE:             120px base radius, partikkeleksplosjon
Damage mult:     2.0x base
```

**Leveling:**

| Nivå | `exp_shot_radius` | `exp_shot_damage` | `kaskade_fyring` |
|---|---|---|---|
| Base | 120px | 2.0x | – |
| Radius lv1-3 | +40px → 160/200/240px | – | – |
| Damage lv1-3 | – | +30% → 2.3/2.6/2.9x | – |
| Chain lv1 | – | – | +2 piler spawner mot nærmeste fiende |
| Chain lv2 | – | – | +3 piler, 20px pileksplosjon |

**Pre-Mortem:** Eksisterende `explosive_arrow`-bug (krasj ved treff) MÅ fixes BEFORE Explosive Shot implementeres – de deler kollisjonssystem.

---

### 2.3 WIZARD – Elementær Kaskade (Elemental Cascade)

```
Hotkey:          [4] — Wizard hotkeys re-mappes til:
                   [1] Ildkule  [2] Frostbolt  [3] Lynglimt  [4] Elemental Cascade
Trigger:         Trykk [4] → aktiver buff
Duration:        4s base (med pulsende lys-overlay)
Effect:          +50% skade på alle aktive tre trolldommer
Visual:          Regnbue-glød rundt spilleren (rotating hue particle ring, lav opacity)
Audio:           `cascade_activate.mp3` (ny)
Cooldown:        10s
```

> **OBS:** Wizard har FIRE spells (Ild/Frost/Lyn + Cascade). Hotkey-slots må re-mappes:
> - [1] Ildkule, [2] Frostbolt, [3] Lynslynger → endrer fra [3/4/5]
> - [4] (åpen) / [5] Elemental Cascade

**Leveling:**

| Nivå | `cascade_duration` | `cascade_damage` | `cascade_chain` | `manaring` |
|---|---|---|---|---|
| Base | 4s, 10s CD | +50% | – | – |
| Duration lv1-3 | 6s / 8s / 10s | – | – | – |
| Damage lv1-3 | – | +65% / +80% / +95% | – | – |
| Chain lv1 | – | – | 2-typer → +50% | – |
| Chain lv2 | – | – | 3-typer → +100% | – |
| Manaring lv1-2 | – | – | – | +25% DR / +40% DR |

---

## DEL 3: CLASS SELECTOR – UI VISUALS

### 3.1 Layout

```
[BAKGRUNN: semi-transparent dark sheet over landing page]

┌──────────────────────────────────────────────────────┐
│           VELG DIN KLASSE                            │
│   «Hvem er du på slagmarken, kriger?»                │
│                                                      │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐            │
│  │ ⚔️      │   │ 🏹      │   │ 🔮      │            │
│  │ KRIEGER │   │ ARCHER  │   │ WIZARD  │            │
│  │ [stats] │   │ [stats] │   │ [stats] │            │
│  │         │   │         │   │         │            │
│  │[VELG]   │   │[VELG]   │   │[VELG]   │            │
│  └─────────┘   └─────────┘   └─────────┘            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 3.2 Class Card – Visuell spek

Hvert kort:
- **Størrelse:** ~280px bred, ~380px høy
- **Border:** 1px solid `rgba(255,255,255,0.15)`, med class-fargeglød `box-shadow: 0 0 20px <classColor>40`
- **Hover-state:** Border opacity → 0.5, glød intensiveres, kort løftes 4px (`translateY(-4px)`)
- **Valgt-state:** Klassen får full glød, en «valgt»-checkmark overlay øverst høyre
- **Ikon:** 64×64px class-sprite-thumbnail (tinted player-sprite) + klasse-ikon

**Fargepalett per klasse:**
| Klasse | Primærfarge | Aksentfarge | Particle-farge |
|---|---|---|---|
| Krieger | `#c0392b` (War Red) | `#e67e22` (Amber) | `#ff4400` |
| Archer | `#27ae60` (Forest Green) | `#f1c40f` (Gold) | `#88ff00` |
| Wizard | `#8e44ad` (Arcane Purple) | `#3498db` (Ice Blue) | `#aa00ff` |

### 3.3 Stat-preview på kortet

```
[STAT BARS - 4 stk]
❤️  HP       ████████░░   +30%   (Krieger)
⚡  FART     ██████░░░░   -10%
⚔️  SKADE    ███████░░░   +20%
🛡️  RUSTNING ███████████   +2
```
Bruker enkle `<div>`-progress bars med CSS transition.

### 3.4 Animations (Framer Motion)

```jsx
// Intro: Cards stagger inn fra bunnen
variants={{ hidden: {y:40, opacity:0}, visible: {y:0, opacity:1} }}
transition={{ staggerChildren: 0.12 }}

// Hover: Hovering
whileHover={{ y: -4, boxShadow: `0 8px 40px ${classColor}60` }}

// Click: Velg
whileTap={{ scale: 0.96 }}
```

---

## DEL 4: SHOP VISUALS – KATEGORIER OG IKONER

### 4.1 Kategori-ikoner (Venstre side i FantasyBook)

Legg til `icon` per kategori; rendres som 20px ikon + tekst-label.

| Kategori | Ikon-asset | Når synlig |
|---|---|---|
| KARAKTER | `item_heart_status` | Alltid |
| DRIVKRAFT ⭐ | `item_swords_crossed` (Krieger) / `item_bow` (Archer) / `item_magic_staff` (Wizard) | Class-eksklusiv |
| MASTRING ⭐ | `item_sword` / `item_bow` / `item_frost_orb` | Class-eksklusiv |
| KAMPTALENT ⭐ | `item_swords_crossed` | Krieger |
| RUSTNING ⭐ | `item_shield` | Krieger |
| TALENTER ⭐ | `item_spear` | Archer |
| SMIDIGHET ⭐ | `item_lightning` | Archer |
| SYNERGI ⭐ | `item_synergy_rune` | Wizard |
| ARKAN KUNNSKAP ⭐ | `item_magic_staff` | Wizard |

### 4.2 Eksklusiv upgrade-behandling i høyre side

```
Normal upgrade:      [ikon] Navn             Nivå ●○○   Pris
Exclusive upgrade:   [ikon✨] Navn  ⬡EKSKL   Nivå ●○○   Pris
                              └→ Gullborder + gylden bakgrunn-tint
```

CSS-klasse for eksklusive:
```css
.upgrade-card--exclusive {
  border: 1px solid #c0963c;
  background: linear-gradient(135deg, rgba(192,150,60,0.08) 0%, transparent 60%);
  box-shadow: inset 0 0 12px rgba(192,150,60,0.15);
}
.upgrade-card--exclusive::before {
  content: '⭐';
  position: absolute; top: 6px; right: 8px;
  font-size: 10px; opacity: 0.7;
}
```

### 4.3 Class-indikator i FantasyBook header

Øverst på venstre side, over kategoriene:
```
[class-icon-small] KRIEGER  ← 12px tekst, muted, med class-fargeaccent
```

---

## DEL 5: TYPESTRUKTUR – `src/config/classes.ts`

```typescript
export type ClassId = 'krieger' | 'archer' | 'wizard';

export interface ClassStats {
  hp: number;         // Multiplikator: 1.3 = +30%
  damage: number;     // 1.2 = +20%
  speed: number;      // 0.9 = -10%
  armor: number;      // Additivt: +2
  attackSpeed?: number;
  dashCharges?: number; // Archer: 2 base
}

export interface ClassConfig {
  id: ClassId;
  displayName: string;
  tagline: string;         // «Nær - sterk - uknuselig»
  description: string;     // 2-3 setninger om playstyle
  color: string;           // Primær HEX-farge
  accentColor: string;
  baseStats: ClassStats;
  startingWeapons: string[];     // Weapon IDs første runde
  classAbilityId: string;        // e.g. 'whirlwind_slash'
  classAbilityHotkey: string;    // '2', '5' etc.
  shopCategories: ShopCategoryDef[];
  exclusiveUpgradeIds: string[]; // IDs som BARE denne klassen ser
  spriteFrame?: string;          // Tinted player sprite frame
}

export interface ShopCategoryDef {
  id: string;          // Unik per klasse: 'krieger_drivkraft'
  label: string;       // Visningsnavn i butikken
  icon: string;        // asset-id
  isExclusive: boolean;
}
```

---

## DEL 6: `src/config/class-upgrades.ts` – SKJEMA

```typescript
// Utvider eksisterende UpgradeConfig med:
export interface ClassUpgradeConfig extends UpgradeConfig {
  classRestriction: ClassId;   // ALDRI undefined her – alle entries er class-spesifikke
  isAbilityUpgrade?: boolean;  // true = påvirker classAbility direkte
}

// Eksempel-entry:
{
  id: 'whirl_damage',
  title: 'Skarpe Kniver',
  icon: 'item_sword',
  category: 'Drivkraft',   // Ny category-string per klasse
  classRestriction: 'krieger',
  isAbilityUpgrade: true,
  maxLevel: 3,
  basePrice: 200,
  priceScale: 2.2,
  description: (lvl) => `+${lvl * 25}% Virvelvind-skade (Nå: ${100 + lvl * 25}%)`
}
```

---

## DEL 7: UpgradeConfig ENDRING

Minimalendring – legg til ett optionalt felt til eksisterende interface:

```typescript
export interface UpgradeConfig {
  // ... eksisterende felt ...
  classRestriction?: ClassId; // Hvis satt: kun den klassen ser oppgraderingen
}
```

Shared upgrades (Karakter-kategori) har `classRestriction: undefined` → vises for alle.

---

## DEL 8: BALANSEOVERSIKT

### Stat-distribusjoner

| Stat | Krieger | Archer | Wizard |
|---|---|---|---|
| HP mult. | ×1.30 | ×0.90 | ×0.80 |
| Damage mult. | ×1.20 | ×1.15 | ×1.25 |
| Speed mult. | ×0.95 | ×1.25 | ×1.00 |
| Armor bonus | +2 flat | 0 | 0 |
| Attack Speed | baseline | ×1.15 | ×1.10 |
| Dash Charges | 1 | 2 | 1 |

### Upgrade-pool per klasse

| | Krieger | Archer | Wizard |
|---|---|---|---|
| Delt (KARAKTER) | 9 | 9 | 9 |
| DRIVKRAFT | 6 | 6 | 6 |
| MASTRING | 6 | 8 | 12 |
| Kategori 4 | 4 (KAMPTALENT) | 4 (TALENTER) | 4 (SYNERGI) |
| Kategori 5 | 4 (RUSTNING) | 4 (SMIDIGHET) | 4 (ARKAN) |
| **Total** | **29** | **31** | **35** |

> Wizard ser litt flere upgrades fordi 3 spells krever mer granulær tuning.

---

## DEL 9: PRE-MORTEM SIMULERINGER

| Scenario | Problem | Løsning |
|---|---|---|
| Archer velger Krieger ved feil | Hotkey [2] aktiverer Whirlwind, ikke bue | Class-selection er irreversibel per run; tydelig UI-bekreftelse |
| Wizard på smal skjerm | 5 hotkey-slots + ability kan slå together på mobil | Klassen er PC-first; mobilresponsivitet er scope-out |
| Eksisterende saves (ingen `playerClass`) | `null`-verdi ved `registry.get('playerClass')` | Default til `'krieger'` + ClassSelector vises ved neste nye run |
| Explosive Shot + bug i `explosive_arrow` | Krasj ved treff deles av begge systemer | Fix `explosive_arrow` bug FØRST (fase 0 av implementasjon) |
| Archer kjøper `whirl_damage` | Kategori ikke synlig → ingen problem | Filter i `FantasyBook` basert på `classConfig.exclusiveUpgradeIds` |
| Cascade activation på lav-end mobil | Particle ring dreper FPS | Cascade particle er optional: `if (graphicsQuality !== 'low')` |

---

## DEL 10: IMPLEMENTASJONSREKKEFØLGE (Faser)

### Fase 0 – Bugfix-Prerequisites (BLOCKER) - Dette skal være fikset allerede. kan oversees. 
- [x] Fiks `explosive_arrow` krasj (deles av Archer Explosive Shot)
- [x] Verifiser at `lightning_multicast` (`Stormskudd`) sprer seg korrekt

### Fase 1 – Architecture (ingen synlige endringer) ✅
- [x] Opprett `src/config/classes.ts` med `ClassConfig`-interface og 3 class-objekter
- [x] Opprett `src/config/class-upgrades.ts` med alle nye eksklusiv-upgrades
- [x] Legg til `classRestriction?: ClassId` i `UpgradeConfig` (upgrades.ts)
- [ ] Legg til `playerClass` i Phaser registry-init
- [x] Oppdater `SaveManager` med `playerClass` + `lastSelectedClass`

### Fase 2 – Class Selection UI
- [ ] Bygg `ClassSelector.tsx` – modal med 3 class-kort
- [ ] Integrer i `App.tsx` mellom landing og `GameContainer`
- [ ] Send `selectedClass` til MainScene via `createGame(config)`
- [ ] Test persistence (continue game husker klasse)

### Fase 3 – Shop Filtering
- [ ] Modifiser `FantasyBook.tsx`: les `playerClass` fra registry
- [ ] Filter kategori-tabs basert på `classConfig.shopCategories`
- [ ] Filter upgrade-grid: `classConfig.exclusiveUpgradeIds.includes(u.id) || !u.classRestriction`
- [ ] Legg til eksklusiv-styling på upgrade-cards

### Fase 4 – Stat Application
- [ ] `MainScene.create()`: les `playerClass`, hent `ClassConfig`, kall `PlayerStatsManager.applyClassModifiers()`
- [ ] Implementer `applyClassModifiers()` i `PlayerStatsManager`

### Fase 5 – Class Abilities
- [ ] Implementer `WhirlwindSlashAbility` i Phaser (ny klasse)
- [ ] Implementer `ExplosiveShotAbility` (modifiserer neste bow-skudd)
- [ ] Implementer `ElementalCascadeAbility` (buff-aura påvirker weapon damage)
- [ ] Koble til hotkeys via `weapons.ts`-utvidelse

### Fase 6 – Nytt innhold + Balanse
- [ ] Legg inn alle (~30) nye upgrade-entries i `class-upgrades.ts`
- [ ] Balance-pass: spill gjennom med alle 3 klasser
- [ ] Justify eksklusiv `iconTint` per klasse

---

## VERIFISERINGSPLAN

### Automatisk
- `npm run build` før og etter hver fase (TypeScript-kompilering)
- Sjekk at ingen `any` er introdusert

### Manuelt (per klasse)
1. Start Nytt Spill → ClassSelector vises
2. Velg Krieger → Hotbar viser Sverd (slot 1), Slot 2 er Whirlwind
3. Åpne butikk → kun KARAKTER + DRIVKRAFT/MASTRING/KAMPTALENT/RUSTNING vises
4. Exclusive upgrade har gullborder
5. Trykk [2] → Whirlwind-animasjon og AoE
6. Avslutt → Continue → klassen huskes, ikke ClassSelector
7. Gjenta for Archer og Wizard

---

*Sist oppdatert: 2026-03-02 | Forfatter: Antigravity*
