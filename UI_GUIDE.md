# Kringsringen UI Design System

Denne guiden definerer retningslinjene for å opprettholde det "Avant-Garde" middelalder-designet i Kringsringen.

## 0. Hovedprinsipper
- **Sprite-først**: Alle dekorative elementer SKAL komme fra `MediavelFree.png`. Ikke bruk emojis eller standard fonter for ikoner.
- **Glassmorphism**: Kombiner tunge tre-elementer med transparens (`backdrop-blur-xl` og `bg-white/[0.03]`) for å skape dybde.
- **Lesbarhet over alt**: Bruk sterke skygger og kontrastrike farger (Gull for viktige ting, Blodrødt for død) mot mørk bakgrunn.

## 1. Sprite-koordinater (Best Practice)
Alle UI-elementer i `medieval-ui.css` er basert på koordinater fra `assets/sprites/ui/MediavelFree.png`.

> [!IMPORTANT]
> **Premium Panel System**: 
> For komplekse UI-elementer som HUD, bruk `.m-panel-medieval`. Dette gir en glass-bakgrunn (`backdrop-blur-xl`) bak spritene for å sikre 100% lesbarhet mot en travel spillbakgrunn.

| Element | Klasse | Bruk |
| :--- | :--- | :--- |
| **Hengende Skilt** | `.m-sign-hanging` | Hovedmenyer, Store overskrifter |
| **Bredt Skilt (HUD)** | `.m-sign-wide` | HUD Header (`-272px -88px`) |
| **Lite Treskilt** | `.m-sign-small` | Knapper, Valgkort |
| **Sverd-ikon** | `.m-icon-sword` | Kamp-stats, Styrke-oppgraderinger |
| **Pluss-ikon** | `.m-icon-plus-small` | Helse, Generelle bonuser |
| **Progress-bar** | `.m-progress-container` | Helse og XP-målere |

## 2. Typografi & Farger
Vi bruker en hierarkisk tilnærming til tekst:

- **Overskrifter (Cinzel)**: Brukes for atmosfæriske titler. Skal alltid ha `m-text-gold` eller `m-text-blood`.
  - `.m-text-gold`: For progression og gull-elementer.
  - `.m-text-blood`: Kun for døds-skjermer eller kritisk fare.
- **Stats & Labels (Inter)**: Brukes for teknisk informasjon. Skal være i `uppercase` og ha lav opacity (`text-amber-100/40`).

## 3. Komponentstruktur
Når du lager nye vinduer:
1. Bruk en **Glass Panel** (`bg-slate-950/80 backdrop-blur-xl`) som bakteppe.
2. Legg til **Hanging Sign** som overskrift øverst.
3. Bruk **Small Signs** som interaktive elementer inni panelet.
4. Legg til **Vignette** (`.m-vignette`) for å fokusere blikket mot midten.

## 4. Animasjoner
Bruk følgende Tailwind-klasser for å gi UIet liv:
- `animate-in fade-in zoom-in`: For vinduer som dukker opp.
- `group-hover:scale-110`: For alle knapper ved hover.
- `m-float`: For skilt som "henger" (gir en følelse av vekt).
