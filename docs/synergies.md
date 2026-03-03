# Synergi-oppgraderinger Forslag

Her er forslag til nye synergier, delt inn i tre kategorier basert på pris og effekt. De er designet for å passe inn i den eksisterende `upgrades.ts` strukturen.

## 🟢 Billige & Enkle (Pris: ~200-300 G)
Mindre justeringer som gir tilfredsstillende "quality of life" eller enkel skale-økning.

*   **Flammepiler (Brennende Treff)**
    *   **Kombinerer:** `arrow_damage` + `fire_damage`
    *   **Mekanikk:** Alle piler gjør x% av basesskaden sin som Fire-DoT (Damage over Time) i 3 sekunder.
*   **Frostskjold (Reaktiv CC)**
    *   **Kombinerer:** `armor` + `frost_slow`
    *   **Mekanikk:** Fiender som gjør nærkampskade på deg fryses umiddelbart i 0.5s og tar tilbake 20% av skaden sin som frostskade.
*   **Statiske Skritt (AoE Bevegelse)**
    *   **Kombinerer:** `speed` + `lightning_damage`
    *   **Mekanikk:** Når du er i bevegelse, bygger du opp "statisk elektrisitet". Hvert 2. sekund zappes den nærmeste fienden for X lynskade.

## 🟡 Mid-Tier & Avanserte (Pris: ~600-800 G)
Ting som endrer hvordan man spiller, og som krever spesifikke builds for å skinne.

*   **Tordenslegga (Sverd + Lyn)**
    *   **Kombinerer:** `knockback` + `lightning_stun`
    *   **Mekanikk:** Hvert sverdslag som treffer en fiende kaller ned et lynnedslag på målet som stummer dem og zapper opptil 3 andre fiender i nærheten.
*   **Vampyr-Inferno (Blodmagi)**
    *   **Kombinerer:** `regen` + `fire_radius`
    *   **Mekanikk:** Ild-eksplosjoner healer deg for 2% av all skade de gjør, men all naturlig HP-regen (fra *Trollblod*) stopper, eller koster litt av max-HP for å kaste.
*   **Lyn-Dash (Mobilitet + Skade)**
    *   **Kombinerer:** `dash_distance` + `lightning_bounces`
    *   **Mekanikk:** Du blir usynlig (i-frames) og skyter frem som et lyn. Alle fiender du passerer gjennom tar massiv lynskade og stummes i 1 sekund.

## 🔴 Dyre & Helt Psyko (Pris: ~1500-3000 G)
Endgame-synergier som bryter spillet på en kul måte, forutsatt at spilleren overlever lenge nok til å anskaffe dem.

*   **Event Horizon (Sverd + Bue End-game)**
    *   **Kombinerer:** `sword_eclipse` + `bow_singularity`
    *   **Mekanikk:** Å gjøre skade med sverdet lader opp en buff. Ved neste pileskudd fyres et massivt sort hull som sakte beveger seg over skjermen, suger inn alle fiender, knuser dem, og eksploderer for dobbel akkumulert skade når den forsvinner.
*   **Termonukleær Kjedereaksjon (Ild + Lyn Ultimatum)**
    *   **Kombinerer:** `fire_chain` + `lightning_voltage`
    *   **Mekanikk:** Fiender som dør mens de brenner, eksploderer ikke bare i ild, men fyrer av kjedelyn i *alle* retninger. Hvert kjedelyn setter fyr på nye mål. Det sprer seg eksponentielt inntil alt på skjermen er aske.
*   **Sjele-Shatter (Frost + Magi)**
    *   **Kombinerer:** `frost_shatter` + `magic_soul_link`
    *   **Mekanikk:** Hvis én sjelelenket fiende knuses (Shatter), splintres *alle* andre sjelelenkede fiender på kartet automatisk, uansett om de var fryst eller ikke. Én kill rydder halve skjermen.
