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

| Wave | Varighet | Fiendetyper | Beskrivelse |
| :--- | :--- | :--- | :--- |
| **1** | 60s | Slime (70%), Orc (30%) | Oppvarming. Fokus på å samle start-gull. |
| **2** | 90s | Orc (60%), Slime (40%) | Økt frekvens. |
| **3** | 60s | **Miniboss: Slime King** | En gigantisk Slime med mye HP og små slimes som spawner rundt den. |

### Map Level 2: De Mørke Stiene
*   **Fullføringsbonus:** Full HP + 200 Gull bonus.
*   **Bølgeoversikt:**

| Wave | Varighet | Fiendetyper | Beskrivelse |
| :--- | :--- | :--- | :--- |
| **1** | 90s | Skeleton (50%), Orc (50%) | Raskere fiender introduseres. |
| **2** | 120s | Armored Skeleton (30%), Skeleton (70%)| Tyngre rustning krever mer skade. |
| **3** | 90s | **Miniboss: Skeleton Captain** | Rask fiende med et stort sverd og kort dash-angrep. |

### Map Level 3: Ulvemarka
*   **Fullføringsbonus:** Full HP + 350 Gull bonus.
*   **Bølgeoversikt:**

| Wave | Varighet | Fiendetyper | Beskrivelse |
| :--- | :--- | :--- | :--- |
| **1** | 120s | Werewolf (20%), Orc (80%) | Ulver angriper i små flokker. |
| **2** | 120s | Werewolf (40%), Armored Orc (60%) | Høy fart kombinert med mye rustning. |
| **3** | 60s | **Miniboss: Alpha Werewolf** | Ekstremt rask. Har et "hyl" som øker farten til andre fiender på skjermen. |

---

## 3. Fiender (Bestiarium)

### Standard Fiender
| Type | HP | Skade | Fart | Spesielt |
| :--- | :--- | :--- | :--- | :--- |
| **Slime** | 30 | 5 | 80 | Svak og treg. Enkel kilde til gull. |
| **Orc** | 50 | 10 | 100 | Basisfiende. |
| **Skeleton** | 40 | 15 | 110 | Rask, men tåler lite. |
| **Werewolf** | 120 | 25 | 160 | Farlig fart. Krever gode reflekser. |
| **Armored Orc** | 250 | 45 | 80 | Tanky. Drit i knockback. |

### Minibosser (Unike utfordringer)
1.  **Slime King:** Logger ned spilleren med slimspor. Dropper en stor pose gull (50-100 coins).
2.  **Skeleton Captain:** Kan blokkere piler med skjoldet sitt.
3.  **Elite Orc Crusher:** Bruker en klubbe som lager en liten sjokkbølge (AoE skade).

---

## 4. Oppgraderinger (The Merchant)

Siden XP er fjernet, er butikken det eneste stedet for progresjon. Prisene skalerer aggressivt for å kreve mer utforskning/farming.

| Kategori | Navn | Effekt | Maks Lvl | BasePris |
| :--- | :--- | :--- | :--- | :--- |
| **Overlevelse** | Vitalitet | +20 Maks HP | 20 | 40 |
| **Overlevelse** | Trollblod | +1 HP/sek Regen | 10 | 100 |
| **Kamp** | Skarpt Stål | +10% Skade | 20 | 60 |
| **Kamp** | Flerskudd | +1 Pil (Kun Bue) | 5 | 250 |
| **Kamp** | Gjennomboring| Piler går gjennom fiender | 3 | 300 |
| **Utility** | Magnet | Øker plukk-opp rekkevidde | 5 | 150 |

---

## 5. Spill-flyt (The Loop)

1.  **Start:** Spilleren starter med 0 gull og basisutstyr.
2.  **Overlevelse:** Bekjemp bølger av fiender i 1-2 minutter per bølge.
3.  **Loot:** Samle gullmynter fra falne fiender.
4.  **Shopping:** Bruk gull i butikken for å bli sterkere før neste bølge/level.
5.  **Victory:** Fullfør alle bølgene på et kart for å bli fullhealet og rykke videre til neste miljø.

---
**Dokumentversjon:** 1.1
**Ansvarlig AI Architect:** Antigravity
