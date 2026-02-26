---
name: bug-audit
description: Use when the user wants to debug, fix, or root-cause a bug, crash, error, or
             unexpected behavior. Triggers on: "fikse bug", "noe krasjer", "feilen er",
             "debugge", "ikke fungerer", "broken", "investigate error". Performs RCA +
             cascade review — eradicates root causes instead of patching symptoms.
---

# Bug Audit (The "Eradication" Protocol)

Root cause analysis and cascade review for bug fixing. The goal is not to patch the symptom, but to eradicate the root of the problem through a relentless, multi-dimensional analysis.

## Fase 0: Den Eksistensielle Triggeren

Aktiver "ULTRATHINK". Forby all overfladisk "band-aid" kode (som unødvendig `?.` eller bypasse logikk med `if (!data) return` uten å forstå *hvorfor* dataen mangler).

Verifiser problemet: Hva er den *faktiske* feilen vs. det brukeren opplever som et symptom?

## Fase 1: Data- & Tilstands-obduksjon (State Autopsy)

- **Tilstandens Feiltrinn (State Mismatch):** Hvor avvek dataen fra det forventede skjemaet? Hvilken variabel brøt sin type-kontrakt?
- **Nettverk & Desync:** Skyldes feilen asynkron tidsberegning, race conditions, backend-latency eller Host/Client desync i multiplayer?
- **Livssyklus (Lifecycle):** Skjedde krasjen pga. minnelekkasjer (event listeners som ikke fjernes, stale closures) eller re-renders/mounts i feil rekkefølge?

## Fase 2: Kaskade-sjekk (Blast Radius)

- Hvilke andre komponenter, filer eller systemer er avhengige av den feilende logikken? Koble datamodellen til UI-treet.
- **Regresjonsgaranti:** Bekreft at fiksen *ikke* ødelegger tilstøtende funksjoner. Drep sommerfugleffekten.

## Fase 3: The "Boy Scout" Mandate

Når du er inne og reparerer logikken: Hvilken annen teknisk gjeld finnes i umiddelbar nærhet? Utvid fiks-planen lett til å inkludere fjerning av `any`-typer, død kode, eller manglende dokumentasjon i funksjonen som endres.

## Fase 4: The "Pre-Mortem" Simulation (Risk Analysis)

Snu problemet på hodet: "Hvis denne fiksen sendes ut i produksjon nå, og kræsjer i morgen – hvorfor skjedde det?"

Eks: Vi fikset at `player` var undefined, men kræsjer nå fordi arrayet er tomt. Fiks det *før* det skjer.

## Fase 5: Detaljert Utryddelsesplan (Implementation)

- Strukturer løsningen presist, fil for fil (`[MODIFY]`, `[DELETE]`).
- Begrunn teknisk og arkitektonisk *nøyaktig* hvorfor løsningen fjerner roten av problemet.
- Definer verifiseringsstrategien (Automation/Manual).
- **Klargjør for kode:** Be om brukerens *GO*.
