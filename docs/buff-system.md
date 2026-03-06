# Kringsringen — Buff & Debuff System

Dette dokumentet beskriver det dynamiske buff/debuff-systemet som ble introdusert i mars 2026 for å gi spilleren bedre visuell og mekanisk feedback på aktive effekter.

> **Status:** ✅ Implementert (mars 2026)
> **Kjernekomponenter:** `BuffManager.ts`, `BuffCard.tsx`, `BuffHUD.tsx`

---

## 1. Arkitektur

### BuffManager (`src/game/BuffManager.ts`)

En centralisert manager som håndterer alle aktive buffs/debuffs i spillet. Kjører i `MainScene` og kommuniserer med React UI-lag via Phaser Registry events.

**Nøkkelfunksjoner:**
- `addBuff(config)` — Legg til ny buff eller stack existing buff
- `removeBuff(id)` — Fjern spesifikk buff
- `getActiveBuffs()` — Hent alle synlige buffs for UI-rendering
- `update(time)` — Utløpskontroll (kjøres i MainScene.update loop)

### Buff Interface

```typescript
export interface Buff {
    id: string;              // Unique instance ID (e.g. 'momentum_123')
    key: string;             // Logic ID (e.g. 'heavy_momentum')
    title: string;           // Display name
    icon: ItemIconKey;       // Icon sprite key
    color: number;           // Hex color for visual effects
    startTime: number;       // Timestamp (ms)
    duration: number;        // -1 for infinite
    stacks: number;          // Current stack count
    maxStacks: number;       // Max stackable
    isVisible: boolean;      // Render in UI?

    // Enhanced metadata
    description?: string;        // Human-readable tooltip
    statModifiers?: BuffStat[];  // Machine-readable stat changes
    category?: BuffCategory;     // 'combat' | 'passive' | 'ultimate' | 'vers'
    priority?: number;           // Display order (higher = first)
}
```

### Stat Modifiers

Buffs kan deklarere presise stat-endringer for tooltip-generering:

```typescript
export interface BuffStat {
    type: 'damage' | 'speed' | 'attackSpeed' | 'damageReduction' | 'crit' | 'lifesteal' | 'heal';
    value: number;
    displayFormat: 'percent' | 'flat' | 'multiplier';
}
```

**Eksempel:**
```typescript
statModifiers: [
    { type: 'damage', value: 25, displayFormat: 'percent' },  // +25% DMG
    { type: 'speed', value: 25, displayFormat: 'percent' }    // +25% SPD
]
```

---

## 2. Buff-kategorier

| Category | Beskrivelse | Eksempler |
|:---|:---|:---|
| `combat` | Aktive kamp-buffs med kort varighet | Whirlwind, Heavy Momentum |
| `passive` | Permanente eller lang-varende passive bonuser | Fortification, Resonansskjold |
| `ultimate` | Kraftige ultimate-evner | Inspirerende Kvad, Arcane Cascade |
| `vers` | Skald Vers-baserte passive bonuser | +SPD (1 Vers), +ATK (2 Vers), +DMG (3 Vers), +CRIT (4 Vers) |

**Priority sorting:** Buffs med høyere `priority` vises først i UI. Default: 0.

---

## 3. UI-komponenter

### BuffHUD (`src/components/ui/BuffHUD.tsx`)

Hovedcontainer som rendrer alle aktive buffs øverst til høyre på skjermen (under Top HUD).

**Layout:**
- Horisontal grid (max 6 per rad)
- Auto-wrap til neste rad ved overflow
- Sortert etter `priority` (høyest først)

**Oppførsel:**
- Lytter til `registry.events` for buff-endringer
- Filtrerer kun `isVisible: true` buffs
- Oppdateres i real-time når buffs legges til/fjernes/utløper

### BuffCard (`src/components/ui/BuffCard.tsx`)

Individuell buff-visning med:
- **Icon:** ItemIcon med glow-effekt i buff-farge
- **Stacks:** Viser stack-count hvis `stacks > 1` (f.eks. "×3")
- **Timer:** Countdown-ring animasjon (SVG circle stroke-dashoffset)
- **Tooltip:** Hover-tooltip med title, description og stat modifiers

**Timer-animasjon:**
- SVG `<circle>` med `stroke-dasharray` for progress ring
- Grønn → Gul → Rød farge-gradient basert på gjenstående tid
- Forsvinner når `duration === -1` (infinite buffs)

---

## 4. Integrasjon med spill-systemer

### Eksempel: Krieger Whirlwind

```typescript
// ClassAbilityManager.ts
this.scene.buffs.addBuff({
    key: 'whirlwind',
    title: 'WHIRLWIND',
    icon: 'item_sword',
    color: 0xffaa00,
    duration: 3000,
    maxStacks: 1,
    isVisible: true,
    description: 'Roterer og gjør skade',
    category: 'combat',
    priority: 12
});
```

### Eksempel: Skald Vers Passive Bonuser

```typescript
// ClassAbilityManager.ts (Resonanspuls)
if (newVers >= 1) {
    this.scene.buffs.addBuff({
        key: 'vers_speed',
        title: 'VERS: Rask Fot',
        icon: 'item_lightning',
        color: 0x88ddff,
        duration: -1,  // Infinite until Vers consumed
        maxStacks: 1,
        isVisible: true,
        description: '+15% fart',
        statModifiers: [{ type: 'speed', value: 15, displayFormat: 'percent' }],
        category: 'vers',
        priority: 8
    });
}
```

---

## 5. Best Practices

### Når bruke buffs:

✅ **Bruk buffs for:**
- Tidsbaserte effekter som spilleren må være klar over (Whirlwind, Inspirerende Kvad)
- Stackable bonuser (Heavy Momentum, Fortification)
- Conditional states (Vers-bonuser, Berserker Rage)

❌ **Ikke bruk buffs for:**
- Permanente passive upgrades (håndteres av `PlayerStatsManager`)
- Instant-effekter uten varighet (healing, damage ticks)
- Interne state flags (bruk `scene.data` eller registry direkte)

### Naming Convention:

- **key:** snake_case logic identifier (`heavy_momentum`, `vers_speed`)
- **title:** UPPERCASE for combat buffs, Title Case for passive
- **icon:** Bruk ItemIconKey fra `ui-atlas.ts`

### Performance:

BuffManager kjører `update()` hver frame for utløpskontroll. Hold antall aktive buffs under 20 samtidig for optimal ytelse.

---

## 6. Fremtidige utvidelser

- [ ] Debuff-støtte (negative effekter fra fiender)
- [ ] Buff-interaksjoner (f.eks. "Frozen + Lightning = Shatter")
- [ ] Kategori-filtrering i BuffHUD (toggle visibility per kategori)
- [ ] Stack decay (stacks reduseres over tid i stedet for instant removal)

---

*Sist oppdatert: 6. mars 2026*
