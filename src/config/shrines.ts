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
    type: 'blessing' | 'curse';
    displayName: string;
    description: string;
    color: number;           // 0xRRGGBB
    duration: number;        // ms
    mods: ShrineMods;
}

export const SHRINE_EFFECTS: ShrineEffectDef[] = [
    // ─── 10 Blessings (gold tones) ──────────────────────────────────────────
    {
        id: 'swiftfoot',
        type: 'blessing',
        displayName: 'KVIKKFOT',
        description: '+50% hastighet',
        color: 0xf6d860,
        duration: 60000,
        mods: { speedMult: 1.5 }
    },
    {
        id: 'warblood',
        type: 'blessing',
        displayName: 'KRIGERSBLOD',
        description: '+60% skade',
        color: 0xffa040,
        duration: 45000,
        mods: { damageMult: 1.6 }
    },
    {
        id: 'iron_skin',
        type: 'blessing',
        displayName: 'JERNHUD',
        description: '+40% maks liv · +3 regen/s',
        color: 0xf0c030,
        duration: 75000,
        mods: { maxHpMult: 1.4, regenBonus: 3 }
    },
    {
        id: 'berserker_gift',
        type: 'blessing',
        displayName: 'GALNINGSGAVE',
        description: '+80% skade · +20% hastighet',
        color: 0xffaa20,
        duration: 45000,
        mods: { damageMult: 1.8, speedMult: 1.2 }
    },
    {
        id: 'rapid_fire',
        type: 'blessing',
        displayName: 'STORMHAGEL',
        description: '−60% angrepsavkjøling',
        color: 0xf6d860,
        duration: 45000,
        mods: { cooldownMult: 0.4 }
    },
    {
        id: 'true_sight',
        type: 'blessing',
        displayName: 'SANNSYNT',
        description: '+35% kritsjanse',
        color: 0xffe080,
        duration: 60000,
        mods: { critBonus: 0.35 }
    },
    {
        id: 'multiweave',
        type: 'blessing',
        displayName: 'FLERTRYLL',
        description: '+2 prosjektiler',
        color: 0xf0c030,
        duration: 60000,
        mods: { extraProjectiles: 2 }
    },
    {
        id: 'serpent_tooth',
        type: 'blessing',
        displayName: 'SLANGEKLO',
        description: '+3 gjennomtrengning · +20% skade',
        color: 0xffa040,
        duration: 60000,
        mods: { pierceBonus: 3, damageMult: 1.2 }
    },
    {
        id: 'life_spring',
        type: 'blessing',
        displayName: 'LIVSKILDE',
        description: '+8 regen/s · +20% maks liv',
        color: 0xf6d860,
        duration: 75000,
        mods: { regenBonus: 8, maxHpMult: 1.2 }
    },
    {
        id: 'godtouch',
        type: 'blessing',
        displayName: 'GUDEGREP',
        description: '+30% skade · +30% hastighet · −30% avkjøling',
        color: 0xffcc00,
        duration: 45000,
        mods: { damageMult: 1.3, speedMult: 1.3, cooldownMult: 0.7 }
    },

    // ─── 10 Curses (purple/red tones) ───────────────────────────────────────
    {
        id: 'slugfoot',
        type: 'curse',
        displayName: 'TYNGFOT',
        description: '−50% hastighet',
        color: 0xaa22ff,
        duration: 60000,
        mods: { speedMult: 0.5 }
    },
    {
        id: 'weakhand',
        type: 'curse',
        displayName: 'SVAKHAND',
        description: '−60% skade',
        color: 0x9900cc,
        duration: 60000,
        mods: { damageMult: 0.4 }
    },
    {
        id: 'brittle_bones',
        type: 'curse',
        displayName: 'SKJØRBEIN',
        description: '−40% maks liv',
        color: 0xcc2222,
        duration: 60000,
        mods: { maxHpMult: 0.6 }
    },
    {
        id: 'bloodlust',
        type: 'curse',
        displayName: 'BLODTØRST',
        description: '+100% skade · −5 HP/s',
        color: 0xdd1111,
        duration: 45000,
        mods: { damageMult: 2.0, drainPerSec: 5 }
    },
    {
        id: 'glass_cannon',
        type: 'curse',
        displayName: 'GLASSKULE',
        description: '+120% skade · −50% maks liv',
        color: 0xcc2222,
        duration: 60000,
        mods: { damageMult: 2.2, maxHpMult: 0.5 }
    },
    {
        id: 'heavy_draw',
        type: 'curse',
        displayName: 'TUNG BUE',
        description: '+150% angrepsavkjøling',
        color: 0x882200,
        duration: 60000,
        mods: { cooldownMult: 2.5 }
    },
    {
        id: 'soul_drain',
        type: 'curse',
        displayName: 'SJELDENVAMP',
        description: '−3 HP/s · −2 regen/s',
        color: 0xaa22ff,
        duration: 75000,
        mods: { drainPerSec: 3, regenBonus: -2 }
    },
    {
        id: 'wild_shot',
        type: 'curse',
        displayName: 'VILSKUDD',
        description: '+3 prosjektiler · −50% skade',
        color: 0x9900cc,
        duration: 60000,
        mods: { extraProjectiles: 3, damageMult: 0.5 }
    },
    {
        id: 'void_touch',
        type: 'curse',
        displayName: 'TOMROMGREP',
        description: '−30% hastighet · −30% skade · +80% avkjøling',
        color: 0xaa22ff,
        duration: 60000,
        mods: { speedMult: 0.7, damageMult: 0.7, cooldownMult: 1.8 }
    },
    {
        id: 'exposed',
        type: 'curse',
        displayName: 'BLOTTLAGT',
        description: '−45% maks liv · −25% skade',
        color: 0xcc2222,
        duration: 60000,
        mods: { maxHpMult: 0.55, damageMult: 0.75 }
    },
];
