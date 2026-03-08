# Kringsringen — Shrine System

> **Status:** ✅ Implementert (mars 2026)
> **Kjernekomponenter:** `src/config/shrines.ts`, `src/game/Shrine.ts`, `src/game/ShrineManager.ts`

---

## Konsept

Helligsteder (Shrines) er interaktive gjenstandar som dukker opp tilfeldig på kartet mellom bølger. Hvert helligsted tilbyr en **Pakt** — en kombinasjon av en velsignelse og en forbannelse. Spilleren velger selv om risikoen er verdt det.

---

## 1. Spawning

`ShrineManager.trySpawnShrine()` kalles fra `WaveManager.startWave()` ved starten av hver bølge.

| Parameter | Verdi |
|:---|:---|
| Spawn-sjanse | 40% per bølge |
| Maks aktive helligsteder | 1 (ingen spawn hvis ett allerede eksisterer) |
| Spawn-radius fra kartsenter | 300–600 px |
| Auto-despawn etter | 30 sekunder (fade-ut) |

Helligsteder spawner **ikke** i multiplayer-modus (guard i `WaveManager`).

---

## 2. Prosedural Pakt-generering (`src/config/shrines.ts`)

Hvert helligsted genereres unikt via `generateShrineEffect()`. En pakt inneholder alltid:

- **1–2 velsignelser** (valgt via vektet tilfeldig trekking)
- **1–2 forbannelser** (ekskluderer stats som allerede brukes i velsignelser)

Verdier er randomiserte innenfor et definert spenn per effekttype.

### Tilgjengelige velsignelser

| nameFrag | Stat | Spenn |
|:---|:---|:---|
| KVIKK | `speedMult` | +25% → +80% hastighet |
| KRIGER | `damageMult` | +30% → +120% skade |
| STORM | `cooldownMult` | −30% → −70% avkjøling |
| JERN | `maxHpMult` | +20% → +60% maks HP |
| LIV | `regenBonus` | +3 → +10 HP/s |
| SYNS | `critBonus` | +10% → +40% kritsjanse |
| FLER | `extraProjectiles` | +1 → +3 prosjektiler |
| SLANGE | `pierceBonus` | +1 → +4 gjennomtrengning |

### Tilgjengelige forbannelser

| nameFrag | Stat | Spenn |
|:---|:---|:---|
| TUNG | `speedMult` | −30% → −70% hastighet |
| SVAK | `damageMult` | −25% → −70% skade |
| TREIG | `cooldownMult` | +80% → +250% avkjøling |
| SKJØRT | `maxHpMult` | −25% → −60% maks HP |
| BLOD | `drainPerSec` | 2–8 HP/s konstant tapping |
| VISNE | `regenBonus` | −1 → −5 HP/s (negativ regen) |

### Navnekonvensjon

Paktens `displayName` er `{velsignelsesFrag}-{forbannelsesFrag}`, f.eks. `KRIGER-BLOD` eller `KVIKK-TREIG`.

### Varighet

Randomisert mellom **40–85 sekunder** per aktivering.

---

## 3. Shrine-objektet (`src/game/Shrine.ts`)

En `Phaser.GameObjects.Container` med egne grafikker:

- **Steinsokkel** — enkle grå rektangler (28×10 base, 20×8 hette)
- **Glødende kule** — pulserende `Arc` i pakt-fargen (lilla `0xcc88ee` for blandede pakter)
- **Tekstetiketter** — 4 linjer: paktnavn, `⚖ PAKT`, velsignelse (gull), forbannelse (rosa)
- **Interaksjonsprompt** — `[C] Aktiver` vises kun når spilleren er ≤ 80 px unna

Dybde: `5500` (over fiender, under UI-lag).

---

## 4. ShrineManager

Håndterer proximitet, aktivering og effektapplisering.

### Lifecycle

```
WaveManager.startWave()
  └─ shrines.trySpawnShrine()
       └─ Shrine spawner på kartet

MainScene.update()
  └─ shrines.update(delta)
       ├─ Sjekker avstand spiller ↔ shrine (80 px)
       ├─ Setter/fjerner [C]-prompt
       └─ HP-drain fra aktiv pakt (akkumulert per sekund)

InputManager emitter 'activate-shrine' (C-tast)
  └─ ShrineManager.onActivateKey()
       └─ activateShrine()
            ├─ Skriver shrineStatMods → registry
            ├─ Kaller stats.recalculateStats()
            ├─ Klamper HP til nytt maks (ved maxHpMult < 1)
            ├─ Publiserer activeShrineEffect → React TopHUD
            └─ Schedulerer clearMods() etter paktens varighet
```

### Registry-nøkler

| Nøkkel | Type | Beskrivelse |
|:---|:---|:---|
| `shrineStatMods` | `ShrineMods \| null` | Aktive stat-modifikatorer. Leses av `PlayerStatsManager.recalculateStats()`. |
| `activeShrineEffect` | `ActiveShrineInfo \| null` | Paktnavn, farger, start-timestamp og varighet. Leses av `TopHUD` for nedtelling. |
| `shrinePromptVisible` | `boolean` | Sann når spilleren er i rekkevidde. Brukes internt + av eventuell debug. |

### Effektapplisering

Shrine-mods leses av `PlayerStatsManager` under `recalculateStats()`. Mods er multiplikatorer eller flat bonus-verdier:

```typescript
// Eksempel: speedMult = 1.5 gir 50% fartboost
finalSpeed = baseSpeed * (shrineStatMods.speedMult ?? 1);

// HP drain kjøres i ShrineManager.update() hvert sekund
// (ikke i PlayerStatsManager — slik at tapingen er gradvis, ikke instant)
```

---

## 5. React-integrasjon (TopHUD)

`TopHUD.tsx` leser `activeShrineEffect` fra Phaser Registry og renderer en **Shrine Effect Badge** øverst på skjermen:

- **Symbol:** `✦` for velsignelse, `✧` for forbannelse, `⚖` for pakt
- **Pulserende** kant ved forbannelse/pakt
- **Nedtelling** i sekunder (sanntid via `setInterval`)
- **Velsignelsestekst** i gull, **forbannelsestekst** i rød

---

## 6. Rydding

`clearMods()` kalles automatisk:
- Når paktens varighet utløper
- Når spilleren dør (`singleplayer-game-over`)
- Manuelt fra `ShrineManager.destroy()` ved scene-teardown

`clearMods()` nullstiller `shrineStatMods`, `activeShrineEffect` og `shrinePromptVisible`, og kaller `recalculateStats()` for å fjerne alle stat-bonuser.

---

## 7. Åpne mangler / fremtidig arbeid

- 🚧 **Lyd** — Ingen SFX ved aktivering av helligsted. Forslag: bruk `sword_clash.wav` eller et dedikert mystisk lydsøk.
- 🚧 **Multiplayer** — Helligsteder er foreløpig singleplayer-only. Nettverkssynkronisering av shrine-spawn og aktivering er ikke implementert.
- 🚧 **Lagring** — Aktiv shrine-pakt lagres ikke til `kringsringen_run_v1`. Ved "Avslutt spill" og "Fortsett" er shrine-effekten borte.
- 🚧 **Visuell polering** — Helligstedet bruker primitiv `scene.add.arc()` grafikk. Et dedikert sprite-asset ville gitt mer karakter.

---

*Sist oppdatert: 8. mars 2026*
