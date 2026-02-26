---
name: feature-audit
description: Use when the user wants to add, design, or plan a new feature or capability.
             Triggers on: "legge til funksjon", "ny feature", "implementere", "planlegge",
             "bygge ny", "add feature", "new feature". Generates a rigorous architecture
             plan (Blueprint → UX → Security → Dataflow) before any code is touched.
             Activate proactively when a new feature request arrives with no existing plan.
---

# Feature Audit (The "Avant-Garde" Architect)

Triggered when a new feature is to be built. Enforces a strict "Quality or Death" philosophy — no code without intent.

## Fase 0: The "Why" Interrogation

- **Intentionality ("No Code Without Intent"):** Løser denne funksjonen et faktisk problem for brukeren? Er funksjonaliteten nødvendig, eller er det scope creep?
- **Kontekstuell sjekk:** Sørg for at elementer som skal lages strengt følger "Intentional Minimalism". Kutt unødige elementer *før* koden planlegges.

## Fase 1: Architecture & Data First (The Blueprint)

- **Schema First:** Definer datastrukturer (`Interfaces`, `Types`, Schema) *før* UI-komponenter vurderes. State er vanskelig; kode er enkelt.
- **Data Flow & Global State:** Kartlegg hvordan data flyter (Props, Context, Redux/Zustand). Justifiser ethvert behov for global state. Kan URL-parametere brukes i stedet for bedre deep linking?

## Fase 2: The "Security & Resilience" Fortress

- **Feilscenarier (Failure Modes):** Hva skjer ved 500 Errors, 5 sekunders latency, eller tomme lister (Empty States)? Kreves *Optimistic UI* eller Skeleton Loaders?
- **Validation:** Sikre at all input går gjennom streng validering (f.eks. Zod) og koden er sikret mot XSS (ingen ukritisk `dangerouslySetInnerHTML`).

## Fase 3: The "Avant-Garde UX" Refinery

- **Beskytt Primærene:** Ikke bygg standard UI-primitiver fra bunnen hvis et bibliotek (eks. Radix/Shadcn) eksisterer. Gjenbruk deres primitiver, men pakk dem inn i unikt design.
- **A11y (Accessibility) er LOV:** Semantisk HTML. Tastaturnavigasjon og Focus states planlegges etter WCAG-standarder.
- **The "Delight" Layer & Motion:** Definer mikro-interaksjoner. Unngå harde kutt i UI-layout (bruk Framer Motion, layout transitions). Hver handling krever elegant feedback (Toast, ripple).

## Fase 4: The Code Quality Gauntlet

- **Types:** `any` er forbudt.
- **Complexity Budget:** Beregn "Cost of Ownership". Kompleks logikk uten proporsjonal gevinst kastes.
- **Boy Scout Rule:** Hvordan integreres dette pent inn i eksisterende kodebase?

## Fase 5: The "Pre-Mortem" Simulation

Tenk ut et scenario hvor funksjonen går i prod og feiler. F.eks: Layout knekker på smal mobilskjerm pga. lister som ikke brekker, eller FPS-dropp. Forhindre problemet *i designfasen*.

## Fase 6: Synthesis & Execution (The Output)

- Generer en kompromissløs og velstrukturert arkitekturplan.
- Presenter hvilke filer som opprettes (`[NEW]`) og modifiseres (`[MODIFY]`).
- Avvent brukerens *GO* (sammen med evt. justeringer) for å iverksette.
