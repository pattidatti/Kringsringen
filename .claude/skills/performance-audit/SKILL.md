---
name: performance-audit
description: Use when the user wants to optimize performance, investigate lag, FPS drops,
             stuttering, memory leaks, or slow rendering in the React+Phaser hybrid.
             Triggers on: "ytelse", "lag", "stutter", "treg", "minnelekkasje", "FPS",
             "performance", "GC spike", "frames dropper", "slow", "optimize". Analyzes
             WebGL draw calls, GC pressure, the React-Canvas bridge, and layout thrashing.
---

# Performance Audit (The "Ultrathink" Masterclass)

Evaluates the application with extreme focus on *Garbage Collection (GC)*, *The React-Canvas Bridge*, and perceived latency in the Phaser + React hybrid.

## Steg 1: The WebGL & Canvas Engine (Spill-kjernen)

- **Draw Call Profiling:** Hvor mange draw calls gjøres per frame? Mål: Batching av sprites, bruke Texture Atlases konsekvent.
- **Garbage Collection (GC) Stutter:** Identifiser "Object Churn" (kortlivede objekter). Er Object Pooling implementert for *absolutt alt* som spawner/despawner ofte? (Fiender, projectiler, partikler, flytende tekst).
- **Texture Memory Allocation:** Sjekk at store bilder ikke lastes inn usynkronisert midt i gameplay (forårsaker harde frys).

## Steg 2: The React-Canvas Bridge (Den Kritiske Grensen)

- **State Desyncs:** Sjekk hvordan spillets status (HP, XP) sendes til React. Brukes event-emitters, eller poller React spillet hver frame? Krev Event-Driven, throttled oppdateringer til UI (maks 10fps for UI-ticks).
- **Overlapping Renders:** Sørg for at React IKKE oppdaterer DOM-en i samme millisekund som Canvas gjør sin `renderer.render()`.

## Steg 3: React Arkitektur & Perceptuell Ytelse (UI)

- **Render-propageringssjekk:** Er globale Context-providere plassert for høyt? (Zustand anbefales for granularitet for å unngå kaskade-renders).
- **Optimistisk UI & Skeletons:** Handlinger mot server skal maskeres med optimistiske oppdateringer. UI-et skal aldri vente på nettverket.
- **Layout Thrashing:** Tvinger UI-animasjoner nettleseren til å kalkulere layout på nytt hver frame? Krev `transform` og `opacity` for CSS-animasjoner.

## Steg 4: Karantene & Pre-Mortem (The Stress Test)

- **6x CPU Slowdown:** Test spillet med DevTools CPU throttling. Feiler delta-time-kalkuleringene slik at kollisjoner brytes? (The "Quantum Tunneling" bug).
- **Rapport (Code of Action):** Generer `performance_audit.md` med:
  - *Critical System Failures* (Memory leaks, GC spikes)
  - *The "Cost of Ownership"* (Er en feature verdt ytelsestapet?)
  - *Boy Scout Mandates* (Konkrete linjer kode som skal refaktoreres)
