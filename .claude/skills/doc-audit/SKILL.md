---
name: doc-audit
description: Use when the user wants to audit, update, or improve project documentation.
             Triggers on: "dokumentasjon", "docs oppdatering", "doc audit", "living archive",
             "sjekk docs", "oppdater dokumentasjon", "mangler docs", "utdatert dokumentasjon".
             Scans for gaps, verifies consistency with assets, and polishes tone/structure.
---

# Doc Audit (The "Living Archive")

This workflow is used to maintain the project's documentation (`docs/`). In a project with "Intentional Minimalism", precise documentation is as important as the code itself.

## Fase 1: Gap-Analyse (The Missing Links)

- **Scanning:** Identifiser nye filer eller systemer som er lagt til siden forrige dokumentasjonsrunde (f.eks. nye `src/config/upgrades.ts` eller `src/enemies/`).
- **Detection:** Er det endringer i gamedesign som ikke er reflektert i `docs/gamedesign_document.md`?
- **Proaktivitet:** Foreslå nye dokumentasjonsfiler hvis et system har blitt for komplekst til å bare eksistere i koden.

## Fase 2: Konsistens-Sjekk (The Truth Test)

- **Audio/Asset Catalog:** Sjekk om `docs/audio_catalog.md` stemmer 100% med filene i `public/assets/audio/`. Drep utdaterte referanser.
- **Link Integrity:** Verifiser at alle markdown-lenker fungerer og at `README.md` er oppdatert med siste arkitekturvalg.

## Fase 3: The "Avant-Garde" Polish

- **Språk & Tone:** Dokumentasjonen skal være teknisk presis, men følge prosjektets estetiske og filosofiske linje. Ingen tørr korporat-prosa.
- **Visualisering:** Foreslå Mermaid-diagrammer der flyten er uklar.

## Fase 4: Eksekvering (The Update)

- Generer oppdateringer til eksisterende `.md`-filer.
- Opprett nye filer (`[NEW]`) ved behov.
- Oppdater prosjektets oversiktskart i `README.md`.

## Fase 5: Verifisering

- Be brukeren lese gjennom for å sikre at den "menneskelige" intensjonen bak systemene er ivaretatt.
