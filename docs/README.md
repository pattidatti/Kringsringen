# Kringsringen Dokumentasjon

Velkommen til den tekniske dokumentasjonen for *Kringsringen*. Her finner du detaljer om spillets arkitektur, systemer og protokoller.

## Developer Guides

### [CLAUDE.md](../CLAUDE.md)
Developer guide for Claude Code — architecture overview, file structure, key systems.

### [Architecture Guide](./architecture.md)
En teknisk dypdykk i Manager-mønsteret og hvordan `main.ts` delegerer logikk.

## Innhold

### [Game Design Document](./gamedesign_document.md)
Fullstendig spilldesign-dokument: spillmekanikk, fiender, bosser, våpen, oppgraderinger, spill-flyt og backlog.

### [Multiplayer Arkitektur](multiplayer/architecture.md)
En grundig gjennomgang av hvordan spillet håndterer sanntidssynkronisering, autoritetsmodeller og nettverksflyt.

### [Lagringssystem](./save_system.md)
Teknisk referanse for to-lags lagringsarkitektur: RunProgress-interface, sjekkpunkter, restore-sekvens og multiplayer-unntak.

### [Lydkatalog](./audio_catalog.md)
Oversikt over lydeffekter og bakgrunnsmusikk brukt i spillet.

### [Buff & Debuff System](./buff-system.md)
Teknisk referanse for BuffManager, buff-kategorier, stat-modifikatorer og UI-komponenter.

### [Synergier & Spesialer](./synergies.md)
Liste over våpen-synergier (f.eks. Thermal Shock) og unike gjenstander.

### [UI Design Guide](./ui_guide.md)
Prinsipper for spillets visuelle uttrykk og Medieval-tema.

### [Klassesystem – Design](./class-system-design.md)
Opprinnelig designdokument for klassesystemet (3 klasser). Skald ble lagt til i etterkant og er dokumentert i GDD seksjon 13.

### [Klassesystem – Detaljert plan](./class-system-detailed-plan.md)
Teknisk implementeringsplan for klassesystemet (fase 1–5).

### [Klassesystem – Fase 6](./class-system-phase6-plan.md)
Plan for å koble inn class-upgrade-effekter i gameplay (ikke fullimplementert per mars 2026).

### [Helligstedsystem (Shrines)](./shrine-system.md)
Teknisk referanse for det proseduralt genererte Pakt-systemet: spawning, blessings/curses, aktivering, stat-applisering og React HUD-integrasjon.

### [Ideer – Nye klasser](./ideer/nye-klasser.md)
Brainstorm for fremtidige klasser: Dyremaner og Runesmeden.

## Nøkkelsystemer

### Lagring (`src/game/SaveManager.ts`)
To separate localStorage-nøkler:
- **`kringsringen_save_v1`** – Meta-progresjon: permanente coins, highStage, audioSettings, graphicsQuality, tutorialSeen
- **`kringsringen_run_v1`** – In-run fremgang: level, wave, gull, oppgraderinger, HP, `playerX/Y`, `savedEnemies`, `waveEnemiesRemaining`

Se [`docs/save_system.md`](./save_system.md) for full teknisk dokumentasjon av lagringssystemet.

### UI-flyt
- **Landing Page** viser «Fortsett Spill» + «Nytt Spill» hvis det finnes en lagret run
- **FantasyBook** har «Avslutt spill»-knapp nederst til venstre (singleplayer only) – lagrer run og går til forsiden
- **Game Over** sletter lagret run automatisk

## Fremtidige emner
- [ ] UI Design System (Cinzel/Medieval-tema)
- [ ] Upgrade Registry (Balance & Synergies)
- [ ] Enemy AI & Pathfinding (Context Steering)
- [ ] Class Upgrade Effects (Fase 6 – se `class-system-phase6-plan.md`)

---
*Sist oppdatert: 8. mars 2026 (Doc Audit)*
