---
description: Den eksistensielle revisjonen av Mekanikk, Game Feel (Juice vs Noise), Cognitive Load, og Flow-tilstand.
---

# Gameplay Audit Workflow (The "Ultrathink" Master class)

Dette er en "Quality or Death" granskning av spillerens opplevelse. Mekanikk som ikke tjener "The Core Loop" skal elimineres (Intentional Minimalism).

## Steg

1. **Eksistensiell Mekanikk & Flow (Phase 0: Intentionality)**
    - **Verdivurdering**: Oppfyller mekanikken et reelt behov? Hvis en funksjon eksisterer kun for å være "kul", vurder fjerning.
    - **The Flow State (Csikszentmihalyi)**: Hvordan skalerer vanskelighetsgraden? Blir spillet overveldende for fort (Frustrasjon) eller for sakte (Kjedsomhet)? 
    - **Cognitive Load**: Er UI-et overveldende i kampsituasjoner? Avant-Garde design krever at UI *trekker seg tilbake* når handlingen er intens.

2. **Det Subtile "Delight"-Laget (Game Feel & Juice)**
    - **Input Determinism & Lag**: Registreres input logisk uavhengig av framerate? Har spillmekanikken "Coyote Time" eller "Jump/Attack Buffering" for å tilgi menneskelig reaksjonstid?
    - **Juice vs. Noise Ratio**: Skaler ned feedback. Er det så mange partikler og screen-shakes at det forstyrrer lesbarheten (Clarity)? *Clarity er viktigere enn Juice.*
    - **Audio-Visuell Synkronisering**: Hvert treff (hit), hvert opptak (pickup) SKAL ha en subtil visuell og auditiv respons. Mangler det, er det en feil.

3. **Resiliens & Boundary Testing (Security)**
    - **The "Tab-Out" Pre-Mortem**: Hva skjer når spilleren bytter fane i 30 sekunder og kommer tilbake? Klemmer spillet delta-tiden (Timestep clamping) slik at fiender ikke teleporterer gjennom vegger?
    - **Exploit & Cheese Testing**: Hva er den kjedeligste, men meste optimale strategien ("Minmaxing")? Hvis det å stå helt stille i et hjørne er best, er designet defekt.

4. **Tilgjengelighet som Lov (Accessibility - A11y)**
    - **Fargeblindhet & Lesbarhet**: Kontraster på varsler (AoE sirkler fra fiender). Kan de ses på alle skjermer?
    - **Motion Sensitivity**: Tar UI-et og spillet hensyn til brukere som blir svimle av overdreven bevegelse (`prefers-reduced-motion`)?

5. **Syntese & Eksekvering (The Output)**
    - Generer `gameplay_audit.md` rapport:
        - *Design Failures & Exploits*.
        - *Juice Deficits* (Hvor spillet føles "flatt").
        - *Cognitive Overload Points* (Hvor grensesnittet feiler i intensitet).
