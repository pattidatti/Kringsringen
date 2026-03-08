export interface ShrineMods {
    speedMult?: number;
    damageMult?: number;
    cooldownMult?: number;   // < 1 = faster, > 1 = slower
    maxHpMult?: number;
    regenBonus?: number;     // HP/s flat
    pierceBonus?: number;
    critBonus?: number;
    extraProjectiles?: number;
    drainPerSec?: number;    // HP drain/s (curses only)
}

export interface ShrineEffectDef {
    id: string;
    type: 'blessing' | 'curse' | 'mixed';
    displayName: string;
    description: string;
    blessingDescription?: string;
    curseDescription?: string;
    color: number;           // 0xRRGGBB
    duration: number;        // ms
    mods: ShrineMods;
}

// ── Internal template types ──────────────────────────────────────────────────

interface BlessingTemplate {
    stat: keyof ShrineMods;
    range: [number, number];
    isInt?: boolean;
    formatDisplay: (v: number) => string;
    nameFrag: string;
    weight: number;
}

interface CurseTemplate {
    stat: keyof ShrineMods;
    range: [number, number];
    isInt?: boolean;
    formatDisplay: (v: number) => string;
    nameFrag: string;
    weight: number;
}

// ── Utility functions ────────────────────────────────────────────────────────

function randBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function randIntBetween(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min + 1));
}

function weightedPick<T extends { weight: number }>(pool: T[]): T {
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let r = Math.random() * total;
    for (const item of pool) {
        r -= item.weight;
        if (r <= 0) return item;
    }
    return pool[pool.length - 1];
}

// ── Blessing templates ───────────────────────────────────────────────────────

const BLESSING_TEMPLATES: BlessingTemplate[] = [
    {
        stat: 'speedMult',
        range: [1.25, 1.80],
        formatDisplay: v => `+${Math.round((v - 1) * 100)}% hastighet`,
        nameFrag: 'KVIKK',
        weight: 10,
    },
    {
        stat: 'damageMult',
        range: [1.30, 2.20],
        formatDisplay: v => `+${Math.round((v - 1) * 100)}% skade`,
        nameFrag: 'KRIGER',
        weight: 10,
    },
    {
        stat: 'cooldownMult',
        range: [0.30, 0.70],
        formatDisplay: v => `\u2212${Math.round((1 - v) * 100)}% avkj\u00f8ling`,
        nameFrag: 'STORM',
        weight: 8,
    },
    {
        stat: 'maxHpMult',
        range: [1.20, 1.60],
        formatDisplay: v => `+${Math.round((v - 1) * 100)}% maks liv`,
        nameFrag: 'JERN',
        weight: 8,
    },
    {
        stat: 'regenBonus',
        range: [3, 10],
        isInt: true,
        formatDisplay: v => `+${v} regen/s`,
        nameFrag: 'LIV',
        weight: 7,
    },
    {
        stat: 'critBonus',
        range: [0.10, 0.40],
        formatDisplay: v => `+${Math.round(v * 100)}% kritsjanse`,
        nameFrag: 'SYNS',
        weight: 8,
    },
    {
        stat: 'extraProjectiles',
        range: [1, 3],
        isInt: true,
        formatDisplay: v => `+${v} prosjektiler`,
        nameFrag: 'FLER',
        weight: 6,
    },
    {
        stat: 'pierceBonus',
        range: [1, 4],
        isInt: true,
        formatDisplay: v => `+${v} gjennomtrengning`,
        nameFrag: 'SLANGE',
        weight: 6,
    },
];

// ── Curse templates ──────────────────────────────────────────────────────────

const CURSE_TEMPLATES: CurseTemplate[] = [
    {
        stat: 'speedMult',
        range: [0.30, 0.70],
        formatDisplay: v => `\u2212${Math.round((1 - v) * 100)}% hastighet`,
        nameFrag: 'TUNG',
        weight: 10,
    },
    {
        stat: 'damageMult',
        range: [0.30, 0.75],
        formatDisplay: v => `\u2212${Math.round((1 - v) * 100)}% skade`,
        nameFrag: 'SVAK',
        weight: 10,
    },
    {
        stat: 'cooldownMult',
        range: [1.80, 3.50],
        formatDisplay: v => `+${Math.round((v - 1) * 100)}% avkj\u00f8ling`,
        nameFrag: 'TREIG',
        weight: 8,
    },
    {
        stat: 'maxHpMult',
        range: [0.40, 0.75],
        formatDisplay: v => `\u2212${Math.round((1 - v) * 100)}% maks liv`,
        nameFrag: 'SKJ\u00d8RT',
        weight: 8,
    },
    {
        stat: 'drainPerSec',
        range: [2, 8],
        isInt: true,
        formatDisplay: v => `\u2212${v} HP/s`,
        nameFrag: 'BLOD',
        weight: 9,
    },
    {
        stat: 'regenBonus',
        range: [-5, -1],
        isInt: true,
        formatDisplay: v => `${v} regen/s`,
        nameFrag: 'VISNE',
        weight: 7,
    },
];

// ── Generator ────────────────────────────────────────────────────────────────

/** Procedurally generates a unique shrine pact with both a blessing and a curse. */
export function generateShrineEffect(): ShrineEffectDef {
    // Pick blessing(s)
    const blessingPicks: BlessingTemplate[] = [weightedPick(BLESSING_TEMPLATES)];
    if (Math.random() < 0.40) {
        const pool = BLESSING_TEMPLATES.filter(t => t.stat !== blessingPicks[0].stat);
        blessingPicks.push(weightedPick(pool));
    }

    // Pick curse(s), excluding stats already used in blessings
    const blessingStats = new Set(blessingPicks.map(t => t.stat));
    const cursePool = CURSE_TEMPLATES.filter(t => !blessingStats.has(t.stat));
    const cursePicks: CurseTemplate[] = [weightedPick(cursePool)];
    if (Math.random() < 0.35) {
        const pool2 = cursePool.filter(t => t.stat !== cursePicks[0].stat);
        if (pool2.length > 0) cursePicks.push(weightedPick(pool2));
    }

    // Roll values and assemble mods
    const mods: ShrineMods = {};
    const blessingDescs: string[] = [];
    for (const t of blessingPicks) {
        const v = t.isInt ? randIntBetween(t.range[0], t.range[1]) : randBetween(t.range[0], t.range[1]);
        (mods as Record<string, number>)[t.stat] = v;
        blessingDescs.push(t.formatDisplay(v));
    }
    const curseDescs: string[] = [];
    for (const t of cursePicks) {
        const v = t.isInt ? randIntBetween(t.range[0], t.range[1]) : randBetween(t.range[0], t.range[1]);
        (mods as Record<string, number>)[t.stat] = v;
        curseDescs.push(t.formatDisplay(v));
    }

    const blessingDescription = blessingDescs.join(' \u00b7 ');
    const curseDescription = curseDescs.join(' \u00b7 ');

    return {
        id: `pact_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        type: 'mixed',
        displayName: `${blessingPicks[0].nameFrag}-${cursePicks[0].nameFrag}`,
        description: `${blessingDescription} \u00b7 ${curseDescription}`,
        blessingDescription,
        curseDescription,
        color: 0xcc88ee,
        duration: randIntBetween(40000, 85000),
        mods,
    };
}
