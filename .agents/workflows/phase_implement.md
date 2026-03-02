---
description: Stegvis implementering av docs/class-system-detailed-plan.md – én fase om gangen med verifisering, rapportering og oppdatering av planen.
---

# `/phase_implement` – Klasse-System Implementerings-Orkestrator

Aktiveres når én fase av `docs/class-system-detailed-plan.md` skal utføres.
Bruk: `/phase_implement Fase N` (f.eks. `/phase_implement Fase 1`) eller bare `/phase_implement` for å fortsette der man slapp.

---

## Steg 0: Orienter deg (ALLTID FØRST)

1. Les `docs/class-system-detailed-plan.md` – identifiser **neste uavkryssede fase** (`[ ]`) under **DEL 10: IMPLEMENTASJONSREKKEFØLGE**.
2. Les `docs/class-system-design.md` for arkitekturkontext.
3. Sjekk relevant eksisterende kode: finn filene som skal berøres av fasen (via `grep_search` / `find_by_name`).
4. Bekreft til brukeren: *«Neste fase er [X]. Her er filene som berøres: [liste]. Klar til å starte?»*
   – Vent på GO fra brukeren før kode skrives.

---

## Steg 1: Kjør Pre-Build Baseline

// turbo
- Kjør `npm run build` (eller `npx tsc --noEmit`) i prosjektrot for å bekrefte at kodebasen er grønn FØR endringer.
- Hvis build feiler: **STOPP**. Rapporter eksisterende feil til brukeren og avslutt – ikke begynn på ny fase over røde feil.

---

## Steg 2: Planlegg fasen (Feature Audit Lite)

For den aktuelle fasen, kjør en konsentrert mini-audit:

- **Schema First:** Hvilke typer/interfaces opprettes eller modifiseres?
- **Avhengigheter:** Hvilke eksisterende filer importerer / importeres av de berørte filene?
- **Failure Modes:** Hva kan gå galt? (Eks: manglende `null`-check, type-konflikt med eksisterende `UpgradeConfig`)
- **Boy Scout Rule:** Er det åpenbar teknisk gjeld i de berørte filene som bør rettes *underveis* (uten scope creep)?

Presenter planen som en kompakt liste. Vent på GO hvis det er signifikante designvalg.

---

## Steg 3: Implementer

- Utfør endringene for fasen, **én fil om gangen**, i avhengighetsrekkefølge (typer → logikk → UI).
- `any` er **forbudt**. Bruk `unknown` + type guards der nødvendig.
- Ingen hardkodede verdier uten kommentar som forklarer hvorfor.
- Gjenbruk eksisterende UI-primitiver (Shadcn/Radix hvis tilgjengelig i prosjektet).

---

## Steg 4: Post-Fase Verifisering

// turbo
1. **Build-check:** Kjør `npm run build` (eller `npx tsc --noEmit`). Null TypeScript-feil er kravet.
2. **Manuell sjekkliste fra `VERIFISERINGSPLAN` i planen:**
   - Gå gjennom de relevante manuelle punktene for fasen.
   - Rapport: ✅ bestått / ❌ feilet / ⚠️ delvis.
3. **Spilletest (hvis Fase 2+):** Start dev-server og verifiser i nettleseren at ingenting er brutt.

---

## Steg 5: Oppdater `docs/class-system-detailed-plan.md`

Marker hvert fullførte steg i fasen:
- `[ ]` → `[x]` for fullførte oppgaver
- Legg til en kort revisjonslinje øverst i dokumentet:
  ```
  > **[DATO] Fase N fullført:** [Kort beskrivelse av hva som ble gjort]
  ```

---

## Steg 6: Faserapporten

Lever en strukturert rapport til brukeren:

```
## ✅ Fase [N] – [Navn] – Fullført

### Hva ble gjort
- [fil] → [kort beskrivelse av endring]
- ...

### Verifisering
| Sjekk              | Status |
|--------------------|--------|
| TypeScript build   | ✅ 0 feil |
| [Manuell test 1]  | ✅ / ❌ |
| ...               |     |

### Neste fase
- **Fase [N+1]: [Navn]** – klar til å startes med `/phase_implement Fase [N+1]`

### Åpne spørsmål / risikoer
- [Evt. ting som krever brukerens avgjørelse før neste fase]
```

---

## Regler

| Regel | Detalj |
|---|---|
| **Aldri start på neste fase automatisk** | Brukeren bestemmer når fase N+1 startes |
| **Aldri skriv kode over røde builds** | Fase 1 pre-build MÅ være grønn |
| **Oppdater planen hver gang** | `class-system-detailed-plan.md` er source of truth |
| **Ingen scope creep** | Kun det fasen sier. Registrer andre funn som «Åpne spørsmål» |
| **`any` er forbudt** | Kast feil i egen kodegjennomgang om det finnes |
