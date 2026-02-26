---
description: Den kompromissløse rotårsaksanalysen (RCA) og kaskade-revisjonen for feilretting.
---
# Bug Audit Workflow (The "Eradication" Protocol)

Triggeres når brukeren vil fikse en bug. Målet er ikke å lappe symptomet, men å utrydde roten til feilen gjennom en nådeløs, flerdimensjonal analyse inspirert av Plan Refiner.

## Fase 0: Den Eksistensielle Triggeren
- **Aktiver "ULTRATHINK".** Forby all overfladisk "band-aid" kode (som unødvendig `?.` eller bypasse logikk med `if (!data) return` uten å forstå *hvorfor* dataen mangler).
- **Verifiser Problemet:** Hva er den *faktiske* feilen vs. det brukeren opplever som et symptom?

## Fase 1: Data- & Tilstands-obduksjon (State Autopsy)
- **Tilstandens Feiltrinn (State Mismatch):** Hvor avvek dataen fra det forventede skjemaet (Schema)? Hvilken variabel brøt sin type-kontrakt?
- **Nettverk & Desync:** Skyldes feilen asynkron tidsberegning, race conditions, backend-latency eller Host/Client desync i multiplayer?
- **Livssyklus (Lifecycle):** Skjedde krasjen pga. minnelekkasjer (event listeners som ikke fjernes, stale closures) eller re-renders/mounts i feil rekkefølge?

## Fase 2: Kaskade-sjekk (Blast Radius)
- Hvilke andre komponenter, filer eller systemer er avhengige av den feilende logikken? (Koble datamodellen til UI-treet).
- **Regresjonsgaranti:** Innestå for (og test mentalt) at fiksen *ikke* ødelegger for andre tilstøtende funksjoner. Drep sommerfugleffekten.

## Fase 3: Phase 4 (Code Quality) - The "Boy Scout" Mandate
- Når du først må inn og reparere logikken: Hvilken annen teknisk gjeld finnes i umiddelbar nærhet? Utvid fiks-planen lett til å inkludere fjerning av `any`-typer, død kode, eller manglende dokumentasjon i funksjonen som endres.

## Fase 4: The "Pre-Mortem" Simulation (Risk Analysis)
- Snu problemet på hodet: "Hvis denne fiksen sendes ut i produksjon nå, og kræsjer i morgen – hvorfor skjedde det?" (Eks: Vi fikset at `player` var undefined, men kræsjer nå fordi arrayet er tomt. Fiks det før det skjer).

## Fase 5: Detaljert Utryddelsesplan (Implementation)
- Strukturer løsningen presist, fil for fil (`[MODIFY]`, `[DELETE]`).
- Begrunn teknisk og arkitektonisk *nøyaktig* hvorfor løsningen fjerner roten av problemet.
- Sørg for at verifiseringsstrategien (Automation/Manual) er definert.
- **Klargjør for kode:** Be om brukerens *GO*.
