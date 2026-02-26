---
name: gameplay-audit
description: Use when the user wants to review, improve, or critique gameplay mechanics,
             game feel, player experience, or game design decisions. Triggers on:
             "gameplay", "spillmekanikk", "game feel", "juice", "flow state", "cognitive
             load", "vanskelighetsgrad", "spiller føler", "game design". Reviews Mechanics,
             Juice vs Noise, Cognitive Load, and Flow State through an "Ultrathink" lens.
---

# Gameplay Audit (The "Ultrathink" Masterclass)

A "Quality or Death" review of the player's experience. Mechanics that don't serve The Core Loop are eliminated — Intentional Minimalism applies to game design too.

## Steg 1: Eksistensiell Mekanikk & Flow (Intentionality)

- **Verdivurdering:** Oppfyller mekanikken et reelt behov? Hvis en funksjon eksisterer kun for å være "kul", vurder fjerning.
- **The Flow State (Csikszentmihalyi):** Hvordan skalerer vanskelighetsgraden? Blir spillet overveldende for fort (Frustrasjon) eller for sakte (Kjedsomhet)?
- **Cognitive Load:** Er UI-et overveldende i kampsituasjoner? Avant-garde design krever at UI *trekker seg tilbake* når handlingen er intens.

## Steg 2: Det Subtile "Delight"-Laget (Game Feel & Juice)

- **Input Determinism & Lag:** Registreres input logisk uavhengig av framerate? Har spillmekanikken "Coyote Time" eller "Jump/Attack Buffering" for å tilgi menneskelig reaksjonstid?
- **Juice vs. Noise Ratio:** Skaler ned feedback. Er det så mange partikler og screen-shakes at det forstyrrer lesbarheten (Clarity)? *Clarity er viktigere enn Juice.*
- **Audio-Visuell Synkronisering:** Hvert treff, hvert opptak SKAL ha en subtil visuell og auditiv respons. Mangler det, er det en feil.

## Steg 3: Resiliens & Boundary Testing

- **The "Tab-Out" Pre-Mortem:** Hva skjer når spilleren bytter fane i 30 sekunder og kommer tilbake? Klemmes delta-tiden (Timestep clamping) slik at fiender ikke teleporterer gjennom vegger?
- **Exploit & Cheese Testing:** Hva er den kjedeligste, men mest optimale strategien ("Minmaxing")? Hvis det å stå helt stille i et hjørne er best, er designet defekt.

## Steg 4: Tilgjengelighet som Lov (A11y)

- **Fargeblindhet & Lesbarhet:** Kontraster på varsler (AoE-sirkler fra fiender). Kan de ses på alle skjermer?
- **Motion Sensitivity:** Tar UI-et og spillet hensyn til brukere som blir svimle av overdreven bevegelse (`prefers-reduced-motion`)?

## Steg 5: Syntese & Eksekvering (The Output)

Generer en revisjonsrapport med:
- *Design Failures & Exploits*
- *Juice Deficits* (Hvor spillet føles "flatt")
- *Cognitive Overload Points* (Hvor grensesnittet feiler under intensitet)
- Konkrete forslag til forbedringer, rangert etter impact
