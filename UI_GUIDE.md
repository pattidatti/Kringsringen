# Kringsringen UI Design System

Denne guiden definerer retningslinjene for å opprettholde det "Avant-Garde" middelalder-designet i Kringsringen.

## 0. Hovedprinsipper
- **Sprite-først**: Alle dekorative elementer SKAL komme fra `MediavelFree.png`. Ikke bruk emojis eller standard fonter for ikoner.
- **Glassmorphism**: Kombiner tunge tre-elementer med transparens (`backdrop-blur-xl` og `bg-white/[0.03]`) for å skape dybde.
- **Lesbarhet over alt**: Bruk sterke skygger og kontrastrike farger (Gull for viktige ting, Blodrødt for død) mot mørk bakgrunn.

## 1. Sprite-koordinater (Cute_Fantasy_UI)
Alle UI-elementer i det nye systemet hentes fra `public/assets/ui/fantasy/`.

### FantasyPanel (9-Slice Grid)
Vi bruker et 3x3 grid system for å unngå bleeding. Koordinater er hentet fra `UI_Frames.png`.

| Variant | X | Y | W | H | Slice |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Wood** | 10 | 10 | 28 | 31 | 10 |
| **Paper** | 58 | 10 | 28 | 31 | 10 |
| **Stone** | 106 | 10 | 28 | 31 | 10 |
| **Gold** | 154 | 10 | 28 | 31 | 10 |
| **Obsidian** | 202 | 10 | 28 | 31 | 10 |

> [!NOTE]
> Bruk `/fantasy-debug` routen i appen for å finne koordinater for nye elementer.

### Gamle Assets (Deprecated)
Tabellen under gjelder kun det gamle systemet som fases ut.
| Element | Klasse | Bruk |
| :--- | :--- | :--- |
| **Hengende Skilt** | `.m-sign-hanging` | Hovedmenyer, Store overskrifter |

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
