---
name: patchnotes
description: >
  Generate Discord-formatted patch notes from git history. Use when the user
  wants to write patch notes, a changelog, or update notes — especially for
  commits not yet pushed. Prompts the user to review and refine before
  outputting the final Discord-ready block. Trigger on: "patchnotes",
  "patch notes", "changelog", "hva er nytt", "skriv patchnotes", "lag patchnotes".
---

# Patchnotes Skill

Du lager Discord-formaterte patchnotes ved å lese kildekode og git-historikk, tolke endringene fra spillerens perspektiv, og stille oppfølgingsspørsmål til listen er ferdig.

## Steg 1 — Hent git-kontekst

Kjør disse kommandoene for å forstå omfanget:

```bash
git log origin/$(git rev-parse --abbrev-ref HEAD)..HEAD --oneline
git diff origin/$(git rev-parse --abbrev-ref HEAD)..HEAD --stat
```

Hvis det ikke finnes en remote, bruk de siste 5–10 commits:
```bash
git log -10 --oneline
```

Brukeren kan også oppgi et annet scope — "siste 3 commits", "alt siden forrige PR", en dato.

## Steg 2 — Les kildekoden, ikke bare commit-meldingene

**Commit-meldinger er utviklerspråk — de beskriver kodeendringen, ikke spilleropplevelsen.**

For hvert betydelig punkt: les de relevante filene og finn ut hva som faktisk skjer fra spillerens side.

Konkret: sjekk alltid faktiske verdier, keybindings og mekanikknavn i kildekoden. Ikke gjett basert på commit-tekst alene. Eksempler:

- Keybinding → les InputManager eller config-filen, ikke commit-meldingen
- Ny mechanic → les config-filen (f.eks. shrines.ts, WaveEventManager.ts) for å forstå hva den gjør
- Visuell endring → les klassen (f.eks. Coin.ts) for å beskrive det spilleren ser

Spørsmål å stille seg per endring:
- Hva opplever spilleren? Ikke hva ble endret i koden
- Hvilken implikasjon har dette for gameplay? (taktisk fordel, risiko, ny mulighet)
- Er det et tall eller en tast som bør verifiseres?

## Steg 3 — Tolk og filtrer

- Er dette synlig for spilleren? → Inkluder
- Er det intern refaktor, infrastruktur, eller dokumentasjon? → Utelat
- Grupper etter kategori der det er naturlig — utelat tomme kategorier:
  - **Nytt** — nye features, mechanics, systemer
  - **Endringer** — justerte verdier, ny oppførsel på eksisterende ting
  - **Fikser** — bug-fikser

## Steg 4 — Skriv utkast med juice

Beskriv endringene som spilleropplevelser med litt energi — ikke som kode-fakta.

**Dårlig**: "Coins bruker nå additive blend mode og arc-bevegelse"
**Bra**: "Coins popper ut med glow-effekt og svinger i en bue mot deg"

**Dårlig**: "Alle prosjektiler bruker standardisert knockback-beregning"
**Bra**: "Fiender som dør med mye kraft flyr av gårde som lik og fader ut"

**Dårlig**: "Wave event gravity_vortex trekker enemies mot (1500, 1500)"
**Bra**: "Gravitetsvorteks — alle fiender suges mot kartsenter; bruk det som snikskyterposisjon"

Formateringsregler:
- Ingen `##`-headers — bruk `**__Tittel__**` for seksjoner, `**Bold**` for kategorier
- Hvert punkt starter med `- `
- Maks én linje per punkt
- Feit viktige substantiver: `**Shrines**`, `**Kjedereaksjon**`
- Ingen prosa, bare punktliste
- Ingen interne modulnavn eller filstier

## Steg 5 — Presenter og spør

Vis utkastet. Still 2–3 korte oppfølgingsspørsmål — bare de som er relevante:
- Mangler noe kontekst eller er noe feil?
- Er noe rent internt som ikke bør stå?
- Versjonsnummer, dato, eller tittel øverst?
- Norsk eller engelsk?

Hold det lett. Ikke still spørsmål om ting som er åpenbare fra konteksten.

## Steg 6 — Lever ferdig blokk

Inkorporer tilbakemeldingen. Output den endelige Discord-blokken som ren tekst klar til å lime inn — ikke pakket inn i en kodeblokk.
