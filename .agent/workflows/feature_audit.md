---
description: State-of-the-Art arkitekturgenerator. Flerdimensjonal analyse av Blueprint, UX, Sikkerhet og Dataflow.
---
# Feature Audit Workflow (The "Avant-Garde" Architect)

Triggeres når en ny funksjon (feature) fra Todo.md skal bygges. Utviklet basert på "Plan Refiner" for å møte en streng "Quality or Death"-filosofi.

## Fase 0: The "Why" Interrogation
- **Intensjonalitet ("No Code Without Intent"):** Løser denne funksjonen et faktisk problem for brukeren? Er funksjonaliteten nødvendig, eller er det scope creep?
- **Kontekstuell sjekk:** Sørg for at elementer som skal lages strengt følger "Intentional Minimalism". Kutt unødige elementer før koden i det hele tatt planlegges.

## Fase 1: Architecture & Data First (The Blueprint)
- **Schema First:** Definer datastrukturer (`Interfaces`, `Types`, Schema) *før* UI-komponenter i det hele tatt vurderes! State er vanskelig; kode er enkelt.
- **Data Flow & Global State:** Kartlegg hvordan data flyter (Props, Context, Redux/Zustand). Justifiser knallhardt ethvert behov for global state. Kan URL parametere brukes i stedet for bedre deep linking?

## Fase 2: The "Security & Resilience" Fortress
- **Feilscenarier (Failure Modes):** Tenk på "Unhappy Paths". Hva skjer ved 500 Errors, 5 sekunders latency, eller ved tomme/ukategoriserte lister (Empty States)? Kreves *Optimistic UI* eller Skeleton Loaders?
- **Validation:** Sikre at all input for funksjonen vil gå gjennom streng validering (f.eks. Zod) og sikre koden mot XSS (ingen ukritisk `dangerouslySetInnerHTML`).

## Fase 3: The "Avant-Garde UX" Refinery
- **Beskytt Primærene:** IKKE bygg standard UI-primitiver fra bunnen hvis et bibliotek (eks. Radix/Shadcn) eksisterer. Gjenbruk deres primitiver, men pakk dem inn i unikt design asymmetrisk/minimalistisk.
- **A11y (Accessibility) er LOV:** Semantisk HTML. Tastaturnavigasjon og Focus states skal planlegges, ifølge WCAG-standarder.
- **The "Delight" Layer & Motion:** Definer mikro-interaksjoner. Unngå harde kutt i UI-layout (bruk Framer Motion, layout transitions). Hver handling krever elegant feedback (f.eks Toast, ripple).

## Fase 4: The Code Quality Gauntlet
- **Types:** `any` er forbudt.
- **Complexity Budget:** Beregn "Cost of Ownership". Kompleks logikk uten proporsjonal gevinst kastes.
- **Boy Scout Rule:** Hvordan integreres dette pent inn i eksisterende kodebase?

## Fase 5: The "Pre-Mortem" Simulation
- Tenk ut et scenario hvor funksjonen går i prod. og feiler (F.eks: Layout knekker på en smal mobilskjerm pga lister som ikke brekker, eller FPS-dropp). Forhindre problemet *i designfasen*.

## Fase 6: Synthesis & Execution (The Output)
- Generer en kompromissløs og ekstremt velstrukturell arkitekturplan.
- Presenter hvilke filer som opprettes (`[NEW]`) og modifiseres (`[MODIFY]`).
- **Dokumentasjonsplan:** Spesifiser hvilke filer i `docs/` som må oppdateres for å reflektere den nye funksjonen.
- Avvent brukerens 'GO' (sammen med evt. justeringer) for å iverksette.
