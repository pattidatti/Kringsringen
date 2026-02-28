# Kringsringen Dokumentasjon

Velkommen til den tekniske dokumentasjonen for *Kringsringen*. Her finner du detaljer om spillets arkitektur, systemer og protokoller.

## Developer Guides

### [CLAUDE.md](../CLAUDE.md)
Developer guide for Claude Code — architecture overview, file structure, key systems, configuration, and debugging notes.

## Innhold

### [Game Design Document](./gamedesign_document.md)
Fullstendig spilldesign-dokument: spillmekanikk, fiender, bosser, våpen, oppgraderinger, spill-flyt og backlog.

### [Multiplayer Arkitektur](multiplayer/architecture.md)
En grundig gjennomgang av hvordan spillet håndterer sanntidssynkronisering, autoritetsmodeller og nettverksflyt.

### [Lydkatalog](./audio_catalog.md)
Oversikt over lydeffekter og bakgrunnsmusikk brukt i spillet.

## Nøkkelsystemer

### Lagring (`src/game/SaveManager.ts`)
To separate localStorage-nøkler:
- **`kringsringen_save_v1`** – Meta-progresjon: permanente coins, highStage, audioSettings
- **`kringsringen_run_v1`** – In-run fremgang: level, wave, gull, oppgraderinger, HP (se GDD seksjon 7.1)

### UI-flyt
- **Landing Page** viser «Fortsett Spill» + «Nytt Spill» hvis det finnes en lagret run
- **FantasyBook** har «Avslutt spill»-knapp nederst til venstre (singleplayer only) – lagrer run og går til forsiden
- **Game Over** sletter lagret run automatisk

## Fremtidige emner
- [ ] UI Design System (Cinzel/Medieval-tema)
- [ ] Upgrade Registry (Balance & Synergies)
- [ ] Enemy AI & Pathfinding (Context Steering)

---
*Sist oppdatert: 28. februar 2026*
