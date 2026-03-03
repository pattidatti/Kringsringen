# Fase 6 – Nytt innhold + Balanse (Class System)

## Context

Klassesystemet er arkitekturelt komplett (fase 1–5): konfigfiler, ClassSelector-UI, FantasyBook-filtrering, stat-applikasjon og class abilities er implementert. Alle 43 class-eksklusiv upgrade-oppføringer finnes i `src/config/class-upgrades.ts`, men **ingen av gameplay-effektene er koblet inn i spillet**. Fase 6 implementerer disse effektene, fikser en kritisk bug der class upgrades ikke kan kjøpes, og legger til iconTint-rendering i butikken.

---

## Kritisk Bug – Må fikses først

**`PlayerStatsManager.applyUpgrade()` kjenner ikke CLASS_UPGRADES**

```ts
// src/game/PlayerStatsManager.ts linje 200
const config = UPGRADES.find(u => u.id === upgradeId);
if (!config) return; // ← alle class upgrades returnerer her
```

**Fix:** importer `CLASS_UPGRADES`, søk begge arrays:
```ts
import { CLASS_UPGRADES } from '../config/class-upgrades';
// ...
const config = [...UPGRADES, ...CLASS_UPGRADES].find(u => u.id === upgradeId);
```

---

## Kritiske filer

| Fil | Rolle |
|---|---|
| `src/game/PlayerStatsManager.ts` | `recalculateStats()` + `applyUpgrade()` |
| `src/game/PlayerCombatManager.ts` | `takePlayerDamage()` – on-hit reactive effects |
| `src/game/main.ts` | Update-loop, sword-hit, enemy-death, dash, spell-fire |
| `src/config/class-upgrades.ts` | Config-kilde (allerede komplett) |
| `src/components/ui/FantasyBook.tsx` | iconTint-rendering |

---

## Oppgaveliste (prioritert)

### Oppgave 1 – Fix applyUpgrade + recalculateStats stat-oppføringer

**`src/game/PlayerStatsManager.ts`**

1. Importer `CLASS_UPGRADES` og søk begge arrays i `applyUpgrade()`.
2. Legg til i `recalculateStats()`:
   - `crit_chance` → `playerCritChance += lvl * 0.05`
   - `coin_magnet` → `coinMagnetRadius = 150 + lvl * 50` (sett i registry)
   - `headshot` (Archer) → `arrowCritBonus = lvl * 0.15` (legges til crit chance ved pilberegning)
   - `eagle_eye` (Archer) → multiplikator på `playerArrowSpeed` og ny `playerArrowMaxRange`
   - `luftmobilitet` (Archer) → `dashCharges = baseCharges + lvl` (Archer base = 2)
   - `massiv_eksplosjon` (Wizard) → legg til `lvl * 40` px på `fireballRadius`
   - `manaring` (Wizard) → sett `manaringDRBonus = lvl === 1 ? 0.25 : 0.40` i registry

---

### Oppgave 2 – Krieger: sword-hit effekter (main.ts, attackHitbox overlap)

Legg til etter eksisterende `e.takeDamage(this.stats.damage, ...)`:

- **`wide_swing`**: Scale attackHitbox circle radius: `30 * (1 + wideSwinLvl * 0.3)` ved swing-start (tilbakestill etter swing)
- **`heavy_momentum`**: Opprett `private momentumStacks = 0; private momentumHitTime = 0`. Hvert sverd-hit: `damage *= (1 + stacks * 0.10)`, stacks += 1 (maks lvl*3), reset stacks etter 3s uten hit.
- **`executioner`**: Hvis `e.hp / e.maxHP < 0.25`: `damage *= 1 + executionerLvl * 0.5`
- **`utstotbar_slag`**: Etter `e.pushback(...)` → hent nærliggende fiender via `spatialGrid` innen 150px av `e.x/e.y` → kall `neighbor.takeDamage(damage * 0.4)` og `neighbor.pushback(e.x, e.y, knockback * 0.6)`

---

### Oppgave 3 – Krieger: enemy-death effekter (main.ts)

I enemy-death callback (der enemy HP ≤ 0 resulterer i destroy). Finn eksisterende sted i main.ts og legg til:

- **`livsstaling`**: Hvis siste hit kom fra sverd (lag privat `lastKillWasMelee: boolean`), heal `lvl * 8` HP (capped til maxHP). Vis grønn skade-tekst via `poolManager.getDamageText(...)`.
- **`battle_cry`**: Legg til `private battleCryKills = 0; private battleCryActiveUntil = 0`. Inkrement per kill. Nå 5 kills → sett `battleCryActiveUntil = Date.now() + 8000`. I damage-beregning: `damage *= battleCryActive ? (1 + battleCryLvl * 0.15) : 1`.

---

### Oppgave 4 – Krieger: PlayerCombatManager reactive effects

**`src/game/PlayerCombatManager.ts`, i `takePlayerDamage()`:**

- **`iron_will`**: Legg til `private ironWillUsedThisLevel = false`. Hvis `hp + pendingHPChange ≤ 0` og `ironWillLvl > 0` og `!ironWillUsedThisLevel`: sett HP til 1, sett flagget, vis gylden tekst "JERNVILJE!".
- **`counter_strike`**: Etter skadeberegning, les `counter_strike` lvl. Kjør `Math.random() < lvl * 0.20`; hvis true: finn nærmeste fiende, kall `enemy.takeDamage(actualDamage * lvl * 0.25)`.
- **`blodust`**: Etter `damageAfterArmor` er kalkulert: les `blodust` lvl; finn kildefiende (trenger srcX/srcY for lookup i spatialGrid), kall `sourceEnemy.takeDamage(actualDamage * lvl * 0.15)`.
- **`mana_shield`** (Wizard): Etter skadeberegning, `if (Math.random() < manaShieldLvl * 0.30)`: absorb skaden (skip pendingHPChange), reduser en tilfeldig spell-CD med 2s.

**Legg til reset av `ironWillUsedThisLevel` i ny level/wave-start.**

---

### Oppgave 5 – Krieger: per-frame passiv-effekter (main.ts update)

- **`berserker_rage`**: I update-loop: `const hpRatio = playerHP / playerMaxHP; berserkerMulti = 1 + Math.floor((1 - hpRatio) / 0.2) * berserkerLvl * 0.05`. Bruk i damage-beregning.
- **`skadeskalering`**: I `recalculateStats()` etter armor-beregning: `if (skadekalLvl > 0) playerDamage *= (1 + armorLvl * skadakalLvl * 0.05)`. Inkluderes i `recalculateStats`.
- **`fortification`**: Privat `fortificationStarted: number = 0`. I update: hvis `player.body.speed < 5` → start timer; etter 2000ms → sett `fortificationActive = true`, bonus armor +`lvl * 20%`. Reset ved bevegelse.

---

### Oppgave 6 – Archer: pil-effekter (main.ts + Arrow.ts)

Arrow-hit registreres i collision callback i main.ts. Legg til:

- **`rikosjett`**: Etter arrow-hit og enemy-skade: finn nærmeste andre fiende innen 500px, spawn ny `Arrow` mot den. Maks `rikosjettLvl` ricochets per original pil (lagre som `arrow.ricochetCount`).
- **`pindown`**: Etter arrow-hit: `if (Math.random() < pindownLvl * 0.20)` → sett `enemy.setVelocity(0,0)` + `enemy.setData('pinnedUntil', Date.now() + (1500 + pindownLvl * 500))`. I Enemy update: sjekk pinned flagg.
- **`shadeskudd`**: Etter enemy-death fra arrow: spawn `shadeskuddLvl` ekstra `Arrow` mot nærmeste fiende.
- **`kite_mastery`**: Etter enemy-death: `dashCooldownEnd = Math.max(Date.now(), dashCooldownEnd - dashCooldown * kite_mastery_lvl * 0.20)`.

---

### Oppgave 7 – Archer: spesialmekanikker

- **`fokusert_skudd`**: Privat `bowChargeStart: number = 0`. Når spilleren holder bue-angrepsknapp (space uten å slippe): begynn å lade. Etter release: `chargedMulti = bowChargeStart > 0 ? 2.0 + (fokusertLvl === 2 ? 0.5 : 0.0) : 1.0`. Vis ladebar-indikator (enkel CSS progress via registry-key `bowChargePercent`).
- **`time_slow_arrow`** (E-tasten): Legg til E-hotkey-sjekk. `if (time_slow_arrow_lvl > 0 && !timeSlowCooldown)`: AoE langsom alle fiender 40% i 3s. Start 15s CD.
- **`aerial_shot`**: Flag `aerialShotActive`. I dash-logikk: hvis bow-skudd skytes mens dashing, ikke anvend fart-tap.
- **`shadow_step`**: Etter dash: `player.setAlpha(0.15)`, sett `shadowStepUntil = Date.now() + (shadowStepLvl * 500)`. Fiender i Enemy.update sjekker: hvis player er i shadow step → ignorer som target.

---

### Oppgave 8 – Wizard: spell-cast effekter (main.ts)

For hver spell-fire (fireball, frostbolt, lightning):

- **`elementar_overfload`**: På cast: sett `overfloadActiveUntil[castType] = Date.now() + 4000`. Hent bonus for de *andre* typene: `overfloadBonus = lvl * 0.10`. Les i damage-beregning.
- **`spell_echo`**: Etter cast: `if (Math.random() < spellEchoLvl * 0.15)` → ikke sett CD.
- **`arcane_insight`**: Privat `castCounter = 0`. Inkrement per cast. Hver 4. cast: `spellCooldown *= (1 - arcaneInsightLvl * 0.30)`.
- **`overload`**: Track per-kast `overloadHits`. I on-hit callback: `overloadHits++`. Etter kast: hvis `overloadHits >= 3` → `nextCastFree = true`.

---

### Oppgave 9 – Wizard: synergier (main.ts)

- **`frozen_lightning`**: I lightning-hit callback: sjekk `enemy.getData('frozenUntil') > Date.now()` → `damage *= 4` og spawn splinter-partikler.
- **`cascade_chain`**: Per-enemy tracking av spell-typer truffet. Sjekk antall unike typer → multipliser damage.
- **`manaring`** DR-effekt: I `PlayerCombatManager.takePlayerDamage()`: `if (cascadeActive && manaringLvl > 0) actualDamage *= (1 - manaringBonus)`.

**Deferred (for kompleks til fase 6):**
- `nullifikasjon` – krever projectile-projectile collisions
- `absolute_zero` – kast frossen fiende som prosjektil
- `blaze_storm` – per-fiende cross-spell tracking

---

### Oppgave 10 – iconTint rendering i FantasyBook

**`src/components/ui/FantasyBook.tsx`**

Legg til `style={{ filter: upgrade.iconTint }}` på ikonelement. Eksisterende `iconTint`-prop er allerede satt i `class-upgrades.ts` for Krieger (rød-oransje), Wizard SYNERGI (lila) og spesielle upgrades.

**iconTint-mønstre:**

| Mønster | Brukes for |
|---|---|
| `'drop-shadow(0 0 5px #cc4400) hue-rotate(-10deg)'` | Krieger DRIVKRAFT, KAMPTALENT, RUSTNING |
| `'drop-shadow(0 0 6px #aaccff) brightness(1.3)'` | Iron Will (legendary) |
| `'drop-shadow(0 0 5px #ff6600) hue-rotate(20deg)'` | Archer DRIVKRAFT |
| `'drop-shadow(0 0 6px #00ccff) hue-rotate(160deg)'` | time_slow_arrow |
| `'drop-shadow(0 0 5px #8800ff) hue-rotate(200deg)'` | Wizard DRIVKRAFT + SYNERGI |

---

### Oppgave 11 – coin_magnet radius-kobling (main.ts)

I coin-pickup overlap – les `coinMagnetRadius` fra registry (satt i recalculateStats, oppgave 1) i stedet for hardkodet 150px.

---

## Nye state-variabler i main.ts

```ts
// Krieger
private momentumStacks: number = 0;
private momentumLastHitTime: number = 0;
private battleCryKills: number = 0;
private battleCryActiveUntil: number = 0;
private fortificationStartedAt: number = 0;
private fortificationActive: boolean = false;
private lastKillWasMelee: boolean = false;
private berserkerMulti: number = 1;

// Archer
private bowChargeStart: number = 0;
private timeSlowCooldownEnd: number = 0;
private shadowStepUntil: number = 0;

// Wizard
private arcaneInsightCastTotal: number = 0;
private overfloadActiveUntil: Record<string, number> = {};
private nextCastFree: boolean = false;
private overloadHits: number = 0;
```

---

## Eksisterende utilities som gjenbrukes

| Utility | Bruk |
|---|---|
| `this.spatialGrid.getNearby(x, y, r)` | Nærliggende fiender for rikosjett, utstotbar_slag, counter_strike |
| `this.poolManager.getDamageText(x, y, val, color)` | Grønn tekst for heal, hvit for buffs |
| `this.poolManager.spawnBloodEffect(x, y)` | Particle VFX for nye effekter |
| `this.time.delayedCall(ms, fn)` | Tidsbegrenste effekter |
| `enemy.getData('frozenUntil')` | Eksisterende frost-tracking |
| `this.registry.get('upgradeLevels')['id'] \|\| 0` | Standard upgrade-leser |

---

## Implementasjonsrekkefølge

1. **Oppgave 1** – Bugfix + recalculateStats (blocker for alt annet)
2. **Oppgave 10** – iconTint rendering (visuelt, uavhengig)
3. **Oppgave 2 + 3** – Krieger sword-hit + death
4. **Oppgave 4 + 5** – Krieger passiv + combat reaktive
5. **Oppgave 6 + 7** – Archer pil + spesialmekanikker
6. **Oppgave 8 + 9** – Wizard spell-cast + synergier
7. **Oppgave 11** – coin_magnet
8. **Balance-pass** – spill gjennom med alle 3 klasser

---

## Verifisering

```bash
npm run build   # Ingen TypeScript-feil etter hver oppgave
npm run dev     # Manuell spilltest
```

**Manuell test per klasse:**

**Krieger:**
1. Ta skade til 40% HP → berserkerMulti > 1 (se skade-tall øke)
2. Kjøp `livsstaling` → kill enemy → grønn heal-tekst
3. Kjøp `iron_will` → ta dødelig hit → overlev med 1 HP
4. Kjøp `wide_swing` → hitbox er bredere under sving
5. Kjøp `battle_cry` → drepe 5 fiender → skade-boost i 8s

**Archer:**
1. Kjøp `rikosjett` → pil hopper til ny fiende etter treff
2. Kjøp `time_slow_arrow` → trykk E → alle fiender bremses
3. Kjøp `shadow_step` → dash → bli usynlig 0.5s
4. Kjøp `kite_mastery` → drepe fiende → dash CD reduseres

**Wizard:**
1. Kjøp `spell_echo` → noen kast starter ikke CD
2. Kjøp `frozen_lightning` → frys fiende, treff med lyn → 4x skade
3. Kjøp `elementar_overfload` → kast fireball → frost og lyn får bonus
4. Kjøp `manaring` → Cascade aktiv → ta skade → DR-bonus

**Generelt:**
- Kjøp class upgrade → `upgradeLevels` har riktig nøkkel (var bugget)
- iconTint vises på alle DRIVKRAFT Krieger-oppgraderinger (rødoransje glød)
- Wizard SYNERGI-upgrades har lila glød

---

*Sist oppdatert: 2026-03-03 | Fase 6 implementasjonsplan*
