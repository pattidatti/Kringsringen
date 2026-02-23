# Kringsringen - Game Design Document (GDD)

Dette dokumentet beskriver spillmekanikken, fremgangen og det planlagte innholdet for **Kringsringen**.

---

## 1. Kjernekonsept og Mål
*   **Mål:** Overlevelse. Det er ingen objekter eller baser som skal beskyttes. Spilleren vinner ved å overleve alle bølger på et kart-nivå.
*   **Mekanikk:** Spilleren navigerer i et åpent landskap og bekjemper fiender som spawner i sirkler rundt spilleren.
*   **Økonomi:** **Gull (Coins)** er den eneste ressursen. XP og karakter-nivåer er fjernet. Fiender dropper gull, som brukes til alle oppgraderinger hos Merchant (Butikken).
*   **Healing:** Spilleren får **Full HP** automatisk når et Map Level er fullført (alle bølger er bekjempet).

---

## 2. Nivå- og Bølgeoversikt (Detailed Level Breakdown)

Hvert Map Level består av flere bølger (Waves). Vanskelighetsgraden øker gjennom multiplikatorer på fiendenes stats.

### Map Level 1: Den Grønne Lysningen
*   **Fullføringsbonus:** Full HP + 100 Gull bonus.
*   **Bølgeoversikt:**

| Wave | Fiendetyper | Antall | Beskrivelse |
| :--- | :--- | :--- | :--- |
| **1** | Slime, Orc | 6 | Oppvarming. Fokus på å samle start-gull. |
| **2** | Slime, Orc | 6 | Økt frekvens. |

### Map Level 2: De Mørke Stiene
*   **Fullføringsbonus:** Full HP + 200 Gull bonus.
*   **Bølgeoversikt:**

| Wave | Fiendetyper | Antall | Beskrivelse |
| :--- | :--- | :--- | :--- |
| **1** | Skeleton, Armored Skeleton, Orc, Slime | 8 | Raskere fiender introduseres. |
| **2** | Skeleton, Armored Skeleton, Orc, Slime | 8 | Tyngre rustning krever mer skade. |
| **3** | Skeleton, Armored Skeleton, Orc, Slime | 8 | Høyere intensitet. |

### Map Level 3: Ulvemarka
*   **Fullføringsbonus:** Full HP + 350 Gull bonus.
*   **Bølgeoversikt:**

| Wave | Fiendetyper | Antall | Beskrivelse |
| :--- | :--- | :--- | :--- |
| **1** | Werewolf, Armored Orc, Skeleton, Armored Skeleton | 12 | Ulver angriper i flokker, møter også tung rustning. |
| **2** | Werewolf, Armored Orc, Skeleton, Armored Skeleton | 12 | Høy fart kombinert med mye rustning. |
| **3** | Werewolf, Armored Orc, Skeleton, Armored Skeleton | 12 | Alle typer i full styrke. |

### Map Level 4: *(Planlagt – Ikke navngitt ennå)*
*   **Bølgeoversikt:** 4 bølger. Introduserer Elite Orc og Greatsword Skeleton. Multiplikator: 2.0x.

### Map Level 5+: *(Planlagt – Endelig utfordring)*
*   **Bølgeoversikt:** 5 bølger. Alle fiendetyper. Multiplikator: 3.0x.

---

## 3. Fiender (Bestiarium)

### Standard Fiender
| Type | HP | Skade | Fart | Spesielt |
| :--- | :--- | :--- | :--- | :--- |
| **Slime** | 30 | 5 | 80 | Svak og treg. Enkel kilde til gull. |
| **Orc** | 50 | 10 | 100 | Basisfiende. |
| **Skeleton** | 40 | 15 | 110 | Rask, men tåler lite. |
| **Armored Skeleton** | 150 | 30 | 100 | Tung rustning, høy knockback-motstand. |
| **Werewolf** | 120 | 25 | 160 | Farlig fart. Krever gode reflekser. |
| **Armored Orc** | 250 | 45 | 80 | Tanky. Drit i knockback. Høy motstand. |
| **Greatsword Skeleton** | 200 | 40 | 90 | Svært tanky, ekstremt knockback-resistent. |
| **Elite Orc** | 300 | 50 | 110 | Mest tanky av alle. *(Kun Level 4+)* |

### Minibosser *(Planlagt – Ikke implementert)*
1.  **Slime King:** Logger ned spilleren med slimspor. Dropper en stor pose gull (50-100 coins).
2.  **Skeleton Captain:** Kan blokkere piler med skjoldet sitt.
3.  **Elite Orc Crusher:** Bruker en klubbe som lager en liten sjokkbølge (AoE skade).

---

## 4. Våpen

| Våpen | Hotkey | Status | Beskrivelse |
| :--- | :--- | :--- | :--- |
| **Sverd** | 1 | Unlocked fra start | Melee, 500ms cooldown. Blokkering (høyreklikk) reduserer skade med 80%. |
| **Bue** | 2 | Kjøpes hos Merchant (200 gull) | Ranged, 800px rekkevidde. Støtter multishot og gjennomboring. |
| **Ildkule (Fireball)** | 3 | Unlocked fra start | Magic, 600px rekkevidde, 80px splash-radius, AoE skade. |

---

## 5. Oppgraderinger (The Merchant)

Siden XP er fjernet, er butikken det eneste stedet for progresjon. Prisene skalerer aggressivt for å kreve mer utforskning/farming.

### Karakter
| Navn | Effekt | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- |
| Vitalitet | +20 Maks HP | 20 | 40 | ✅ Implementert |
| Trollblod | +1 HP/sek Regen | 10 | 100 | ⚠️ Kjøpbar, men regen-effekten mangler i game loop |
| Fart | +10 Bevegelseshastighet | 10 | 50 | ✅ Implementert |
| Rustning | +1 Skade-reduksjon | 10 | 75 | ✅ Implementert |

### Sverd
| Navn | Effekt | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- |
| Skarpt Stål | +10% Skade | 20 | 60 | ✅ Implementert |
| Tungt Slag | +15% Knockback | 10 | 50 | ✅ Implementert |
| Berserk | +10% Angrepshastigheit | 10 | 80 | ✅ Implementert |

### Bue
| Navn | Effekt | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- |
| Bueskytter | Låser opp buen (hotkey 2) | 1 | 200 | ✅ Implementert |
| Hurtig Spenn | -10% Cooldown | 10 | 60 | ✅ Implementert |
| Flerskudd | +1 Pil per skudd | 5 | 250 | ✅ Implementert |
| Gjennomboring | Piler går gjennom fiender | 3 | 300 | ⚠️ Kjøpbar, pierce-logikk ikke implementert |

### Utility
| Navn | Effekt | Maks Lvl | BasePris | Status |
| :--- | :--- | :--- | :--- | :--- |
| Magnet | Øker pick-up-rekkevidde | 5 | 150 | ⚠️ I GDD, men radius er hardkodet (150px) – skalering ikke implementert |

---

## 6. Spill-flyt (The Loop)

1.  **Start:** Spilleren starter med 0 gull og basisutstyr (sverd + ildkule).
2.  **Overlevelse:** Bekjemp bølger av fiender.
3.  **Loot:** Samle gullmynter fra falne fiender (1-5 per fiende).
4.  **Shopping:** Bruk gull i butikken for å bli sterkere før neste bølge/level.
5.  **Victory:** Fullfør alle bølgene på et kart for å bli fullhealet og rykke videre til neste miljø.

---

## 7. Kart og Miljø

Hvert Map Level genererer et unikt kart med samme grunnstruktur men ulik visuell identitet:
- **Grunnstruktur:** En åpen lysning (radius 800px) omringet av tett skog med trær og busker.
- **Variasjon:** Ulike ground tiles, rocks, og plantevarianter avhengig av level.

| Level | Tema | Kjennetegn |
| :--- | :--- | :--- |
| **1** | Den Grønne Lysningen | Frisk gress, blomster og dirt-flekker |
| **2** | De Mørke Stiene | Mørkere underlag, noen spredte rocks |
| **3** | Ulvemarka | Rugged terreng, mange rocks, tettere skog |
| **4+** | *(Planlagt)* | – |

---

**Dokumentversjon:** 1.2
**Ansvarlig AI Architect:** Antigravity
