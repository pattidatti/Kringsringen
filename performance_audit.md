# Performance Audit – Kringsringen

**Dato:** 2026-03-06
**Scope:** GC/Object Churn, React-Canvas Bridge, Hot-Path Allocations, Perceptuell Ytelse

---

## Critical System Failures

### 1. SpatialGrid.findNearby() — Massiv Object Churn (KRITISK)

**Fil:** `src/game/SpatialGrid.ts:52,79`

Hver kall til `findNearby()` allokerer `new Set()` + `Array.from()`. Denne metoden kalles:
- Per fiende AI-oppdatering (100ms intervall, 100 fiender = 1000 Set+Array/sek)
- Per pil-treff (Shadeskudd, Rikosjett)
- Per melee-treff (Utstotbar Slag AOE)
- Per Whirlwind-tick

**Estimert:** 60+ midlertidige objekter/sekund under kamp. Over 1 time: ~216,000 garbage-objekter fra spatial queries alene.

**Fix:** Gjenbruk statisk buffer-array og `.clear()` på Set i stedet for ny allokering per kall.

---

### 2. Whirlwind spread+filter — 360 arrays over 3 sekunder (KRITISK)

**Fil:** `src/game/ClassAbilityManager.ts:101-104`

```ts
const targets = [...this.scene.enemies.getChildren(), ...this.scene.bossGroup.getChildren()];
const hitEnemies = targets.filter(e => e.active && Distance.Between(...) <= radius);
```

Kjører **hvert frame** under Whirlwind (3s = ~180 frames). Hver frame: spread-allokering + filter-allokering = 360+ arrays.

**Fix:** Bruk `spatialGrid.findNearby()` i stedet for å iterere alle fiender. Eller iterer direkte uten spread/filter.

---

### 3. Arrow.fire() WeakSet — Per-prosjektil allokering (HØY)

**Fil:** `src/game/Arrow.ts:180`

`this.hitEnemies = new WeakSet()` kalles ved hver `fire()`. Med multishot (5+ piler per angrep) = 5+ allokeringer per skudd.

**Fix:** `.clear()` på eksisterende WeakSet i stedet for å opprette ny. (WeakSet har ikke `.clear()` — bytt til `Set` med manuell cleanup, eller bruk et gjenbrukbart objekt.)

---

### 4. main.ts spatialGrid rebuild — Objekt-literal per fiende (MEDIUM)

**Fil:** `src/game/main.ts:385-391`

Spatial grid rebuild oppretter `{ x, y, width, height, id, ref }` objekt-literal for **hver aktiv fiende** per throttle-syklus (~100ms). Ved 100 fiender = 100 objekt-allokeringer per syklus.

**Fix:** Gjenbruk GridClient-objekter (f.eks. lagre dem på fiende-instansen).

---

### 5. Deferred emitter cleanup — Minnelekkasje-vektor (MEDIUM)

**Filer:**
- `src/game/WeatherManager.ts:83-86` — `delayedCall(2000, ...)` for emitter destroy
- `src/game/AmbientParticleManager.ts:93-102` — `delayedCall(500, ...)` for emitter destroy

Hvis scene avsluttes før timer utløper, forblir emitters i minnet.

**Fix:** Legg til `scene.events.once('shutdown', ...)` for umiddelbar cleanup.

---

## The "Cost of Ownership"

### Framer Motion i BossHUD — Uendelig animasjonsloop

**Fil:** `src/components/ui/BossHUD.tsx:112-117`

Phase 2 puls-effekt bruker `repeat: Infinity` Framer Motion animasjon. Kjører kontinuerlig selv om BossHUD er minimert/usynlig. Estimert 5-10% ekstra CPU under boss-kamp.

**Vurdering:** Bytt til CSS `@keyframes` — samme visuell effekt, null JS-overhead.

### BuffHUD AnimatePresence layout — Kostbar ved mange buffs

**Fil:** `src/components/ui/BuffHUD.tsx:108`

`mode="popLayout"` trigger layout-animasjon ved hver buff add/remove. Med 10+ buffs under ability-spam = merkbar jank.

**Vurdering:** Bytt til `mode="wait"` eller fjern layout-animasjoner for stack-endringer.

### Utrottlede cooldown-keys — 60 events/sek

**Filer:** `Hotbar.tsx:78,80-82`, `DashCooldownBar.tsx:7`, `ClassAbilityBar.tsx`

`weaponCooldown`, `classAbilityCooldown`, `dashState` bruker `useGameRegistry` (utrottlet) — trigger React event-prosessering 60x/sek selv om RAF-loop håndterer animasjonen uavhengig.

**Vurdering:** Bytt til `useGameRegistryThrottled(..., 50)` — RAF-loopen leser fra timestamp uansett.

### Width-baserte progress bars — Layout reflow

**Filer:** `src/styles/medieval-ui.css` (progress bars), `BossHUD.tsx:100`

`transition: width 0.3s` trigger layout-reflow. `scaleX()` transform gjør det samme visuelt, men uten reflow.

---

## Boy Scout Mandates

Konkrete linjer som bør refaktoreres:

| Prioritet | Fil:Linje | Problem | Anbefalt fix |
|---|---|---|---|
| KRITISK | `SpatialGrid.ts:52,79` | `new Set()` + `Array.from()` per query | Statisk buffer + `.clear()` |
| KRITISK | `ClassAbilityManager.ts:101-104` | Spread+filter hvert frame i Whirlwind | Bruk spatialGrid eller direkte iterasjon |
| HØY | `Arrow.ts:180` | `new WeakSet()` per `fire()` | Gjenbruk/clear per instans |
| HØY | `BossHUD.tsx:112-117` | Infinite Framer Motion loop | CSS `@keyframes` |
| HØY | `BuffHUD.tsx:103` | Parent ikke memoized | Wrap med `React.memo` |
| MEDIUM | `main.ts:385-391` | Objekt-literal per fiende i grid rebuild | Gjenbruk GridClient på fiende |
| MEDIUM | `LightningBolt.ts:55,254` | `new Set()` per bounce | Pool/gjenbruk |
| MEDIUM | `WeatherManager.ts:83-86` | Deferred emitter cleanup | Shutdown-listener |
| MEDIUM | `AmbientParticleManager.ts:93-102` | Deferred emitter cleanup | Shutdown-listener |
| LAV | `Hotbar.tsx:78,80-82` | Utrottlet cooldown registry | `useGameRegistryThrottled` |
| LAV | `medieval-ui.css` (progress bars) | Width-transition trigger reflow | `scaleX()` transform |
| LAV | `ObjectPoolManager.ts:88` | Damage text tracking-objekt per hit | Ring buffer |

---

## Styrker (Ikke endre)

- **Event-driven registry bridge** — ingen polling, ingen global context cascade
- **Phaser Registry** som eneste state-bro — eliminerer shared state libs
- **Object pooling** for alle prosjektiler, fiender, coins, VFX (ObjectPoolManager)
- **Enemy AI statiske buffere** — `INTEREST_BUFFER`, `DANGER_BUFFER`, cos/sin-tabeller forhåndsallokert
- **HP targets array reuse** — `hpTargets.length = 0` i stedet for ny allokering
- **Delta-time capping** — `Math.min(delta, 100)` forhindrer spiral-of-death
- **Memoization** på kritiske HUD-komponenter (TopHUD, Hotbar, DashCooldownBar, BossHUD)
- **Throttled AI** — 100ms intervall forhindrer per-frame AI-kost
- **BossHUD direkte event-subscription** — unngår React re-renders for HP-bar
