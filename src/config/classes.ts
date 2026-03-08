/**
 * CLASS SYSTEM – Configuration
 * Fase 1: Arkitektur-lag. Ingen runtime-kobling ennå.
 *
 * Stats:
 *   hp / damage / speed / attackSpeed → multiplikatorer (1.0 = baseline)
 *   armor → additivt flat bonus
 *   dashCharges → antall dash-ladinger (Archer: 2, andre: 1)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ClassId = 'krieger' | 'archer' | 'wizard' | 'skald';

export interface ClassStats {
    /** Multiplikator på BASE_MAX_HP (1.30 = +30%) */
    hp: number;
    /** Multiplikator på BASE_DAMAGE (1.20 = +20%) */
    damage: number;
    /** Multiplikator på BASE_SPEED (0.95 = -5%) */
    speed: number;
    /** Flat bonus på baseArmor (additivt: +2) */
    armor: number;
    /** Valgfri multiplikator på attack speed (1.15 = +15%) */
    attackSpeed?: number;
    /** Antall dash-ladinger (default: 1) */
    dashCharges?: number;
}

export interface ShopCategoryDef {
    /** Unik per klasse, f.eks. 'krieger_drivkraft' */
    id: string;
    /** Visningsnavn i FantasyBook */
    label: string;
    /** Asset-id for kategori-ikonet */
    icon: string;
    /** true = kun denne klassen ser kategorien */
    isExclusive: boolean;
    /** Valgfri overstyring av kapittel-titler for denne kategorien */
    chapterLabels?: Partial<Record<import('./upgrades').ChapterId, string>>;
}

export interface ClassConfig {
    id: ClassId;
    displayName: string;
    /** Kort tagline: «Nær - sterk - uknuselig» */
    tagline: string;
    /** 2-3 setninger om playstyle (brukes i ClassSelector) */
    description: string;
    /** Primær HEX-farge for UI-elementer og glow */
    color: string;
    /** Sekundær HEX-farge for aksenter */
    accentColor: string;
    /** Particle-farge for class-ability effekter */
    particleColor: string;
    /** Base-stats (multiplikatorer + additivt armor) */
    baseStats: ClassStats;
    /** Weapon IDs ved spillstart */
    startingWeapons: string[];
    /** ID til klassens aktive ability */
    classAbilityId: string;
    /** Hotkey-string for ability ('2', '4' osv.) */
    classAbilityHotkey: string;
    /** 3 korte nøkkelord for klassen */
    traits: string[];
    /** Path til portrett-bilde */
    portrait: string;
    /** Rekkefølge og definisjon av shop-kategorier */
    shopCategories: ShopCategoryDef[];
    /** Upgrade-IDs som KUN denne klassen ser */
    exclusiveUpgradeIds: string[];
}

// ─── Helper: validation guard ─────────────────────────────────────────────────

const VALID_CLASS_IDS: readonly ClassId[] = ['krieger', 'archer', 'wizard', 'skald'] as const;

export function isValidClassId(value: unknown): value is ClassId {
    return typeof value === 'string' && (VALID_CLASS_IDS as readonly string[]).includes(value);
}

/** Returnerer classId hvis gyldig, ellers 'krieger' som safe default */
export function resolveClassId(value: unknown): ClassId {
    return isValidClassId(value) ? value : 'krieger';
}

// ─── Class Definitions ───────────────────────────────────────────────────────

const KRIEGER: ClassConfig = {
    id: 'krieger',
    displayName: 'Krieger',
    tagline: 'Nær · Sterk · Uknuselig',
    description:
        'Mestreren av nærstridskunsten. Krigerens rustning er et skjold, og hvert slag sender fiendene flygende. ' +
        'Høy HP og rustning gjør deg til en levende festning — men du betaler med fart. ' +
        'Whirlwind Slash renser slagfeltet i ett roterende gleffs.',
    color: '#c0392b',
    accentColor: '#e67e22',
    particleColor: '#ff4400',
    baseStats: {
        hp: 1.30,       // +30% Maks HP
        damage: 1.20,   // +20% Skade
        speed: 0.95,    // -5% Fart
        armor: 2,       // +2 flat rustning
    },
    startingWeapons: ['sword'],
    classAbilityId: 'whirlwind_slash',
    classAbilityHotkey: '2',
    traits: ['Solid rustning', 'Høy styrke', 'Tungt sverd'],
    portrait: 'assets/ui/portraits/krieger_portrait.png',
    shopCategories: [
        {
            id: 'krieger_sverd',
            label: 'SVERD',
            icon: 'item_sword',
            isExclusive: true,
            chapterLabels: {
                foundation: 'Sverd',
                combat_style: 'Villskap',
                synergy: 'Sverdets Magi'
            }
        },
        {
            id: 'krieger_virvelvind',
            label: 'VIRVELVIND',
            icon: 'item_swords_crossed',
            isExclusive: true,
            chapterLabels: {
                ability: 'Virvelvind'
            }
        },
        {
            id: 'krieger_rustning',
            label: 'RUSTNING',
            icon: 'item_shield',
            isExclusive: true,
            chapterLabels: {
                foundation: 'Rustning',
                combat_style: 'Forsvarsteknikk'
            }
        },
        {
            id: 'karakter',
            label: 'KARAKTER',
            icon: 'item_heart_status',
            isExclusive: false,
            chapterLabels: {
                foundation: 'Helse',
                ability: 'Dash',
                combat_style: 'Egenskaper'
            }
        },
    ],
    exclusiveUpgradeIds: [
        // SVERD
        'whirl_damage', 'whirl_cooldown', 'whirl_chain',
        'berserker_rage', 'livsstaling', 'blodust',
        'damage', 'knockback', 'attack_speed', 'sword_eclipse', 'wide_swing', 'heavy_momentum',
        'counter_strike', 'stomp', 'battle_cry', 'executioner',
        // RUSTNING
        'skadeskalering', 'utstotbar_slag', 'iron_will', 'fortification', 'armor',
    ],
};

const ARCHER: ClassConfig = {
    id: 'archer',
    displayName: 'Archer',
    tagline: 'Presis · Mobil · Dødelig',
    description:
        'Eksperten på avstandskontroll og mobilitet. Archer er skjør, men lynrask — ' +
        'to dash-ladinger lar henne holde avstand mens pilene hagler. ' +
        'Fantombyge (Phantom Volley) utløser en nådeløs, maskingeveær-lignende sverm av piler som knuser alt i sin vei.',
    color: '#27ae60',
    accentColor: '#f1c40f',
    particleColor: '#88ff00',
    baseStats: {
        hp: 0.90,            // -10% Maks HP
        damage: 1.15,        // +15% Skade
        speed: 1.25,         // +25% Fart
        armor: 0,
        attackSpeed: 1.15,   // +15% Angrepsfart
        dashCharges: 2,      // 2 dash-ladinger base
    },
    startingWeapons: ['bow'],
    classAbilityId: 'phantom_volley',
    classAbilityHotkey: '2',
    traits: ['Lynrask', 'Presise skudd', 'Høy mobilitet'],
    portrait: 'assets/ui/portraits/archer_portrait.png',
    shopCategories: [
        {
            id: 'archer_bue',
            label: 'BUE',
            icon: 'item_bow',
            isExclusive: true,
            chapterLabels: {
                foundation: 'Bue',
                combat_style: 'Presisjon',
                synergy: 'Feller'
            }
        },
        {
            id: 'archer_fantombyge',
            label: 'FANTOMBYGE',
            icon: 'item_spear',
            isExclusive: true,
            chapterLabels: {
                ability: 'Fantombyge'
            }
        },
        {
            id: 'archer_smidighet',
            label: 'SMIDIGHET',
            icon: 'item_lightning',
            isExclusive: true,
            chapterLabels: {
                foundation: 'Smidighet',
                ability: 'Akrobatikk',
                combat_style: 'Unnvikelse'
            }
        },
        {
            id: 'karakter',
            label: 'KARAKTER',
            icon: 'item_heart_status',
            isExclusive: false,
            chapterLabels: {
                foundation: 'Helse',
                ability: 'Dash',
                combat_style: 'Egenskaper'
            }
        },
    ],
    exclusiveUpgradeIds: [
        // BUE
        'volley_count', 'volley_damage', 'volley_pierce',
        'rikosjett', 'fokusert_skudd', 'shadeskudd',
        'bow_cooldown', 'multishot', 'pierce', 'arrow_damage', 'arrow_speed',
        'explosive_arrow', 'bow_singularity', 'poison_arrow', 'frost_trap',
        'headshot', 'eagle_eye', 'pindown', 'time_slow_arrow',
        // SMIDIGHET
        'luftmobilitet', 'aerial_shot', 'shadow_step', 'kite_mastery',
    ],
};

const WIZARD: ClassConfig = {
    id: 'wizard',
    displayName: 'Wizard',
    tagline: 'Elemental · Kontroll · Kaos',
    description:
        'Mesteren av elementær magi. Tre distinkte trolldommer — Ildkule, Frostbolt og Lynglimt — ' +
        'skaper synergieffekter ingen annen klasse kan matche. ' +
        'Arcane Singularity maner frem et massivt tyngdefelt som suger fiender inn over 3 sekunder, før det kollapser i en knusende eksplosjon.',
    color: '#8e44ad',
    accentColor: '#3498db',
    particleColor: '#aa00ff',
    baseStats: {
        hp: 0.80,           // -20% Maks HP
        damage: 1.25,       // +25% Skade
        speed: 1.00,        // Baseline fart
        armor: 0,
        attackSpeed: 1.10,  // +10% Angrepsfart (raskere kasting)
    },
    startingWeapons: ['fireball', 'frost', 'lightning'],
    classAbilityId: 'cascade',
    classAbilityHotkey: '4',
    traits: ['Elementær kraft', 'Områdekontroll', 'Mektige spells'],
    portrait: 'assets/ui/portraits/wizard_portrait.png',
    shopCategories: [
        {
            id: 'wizard_ild',
            label: 'ILDMAGI',
            icon: 'item_magic_staff',
            isExclusive: true,
            chapterLabels: {
                uncategorized: 'Ildmagi'
            }
        },
        {
            id: 'wizard_frost',
            label: 'FROSTMAGI',
            icon: 'item_frost_orb',
            isExclusive: true,
            chapterLabels: {
                uncategorized: 'Frostmagi'
            }
        },
        {
            id: 'wizard_torden',
            label: 'TORDENMAGI',
            icon: 'item_lightning_staff',
            isExclusive: true,
            chapterLabels: {
                uncategorized: 'Tordenmagi'
            }
        },
        {
            id: 'wizard_evner',
            label: 'EVNER',
            icon: 'item_magic_staff',
            isExclusive: true,
            chapterLabels: {
                ability: 'Kaskade',
                combat_style: 'Arkan Kunnskap'
            }
        },
        {
            id: 'wizard_synergi',
            label: 'SYNERGI',
            icon: 'item_synergy_rune',
            isExclusive: true,
            chapterLabels: {
                synergy: 'Mesterverk'
            }
        },
        {
            id: 'karakter',
            label: 'KARAKTER',
            icon: 'item_heart_status',
            isExclusive: false,
            chapterLabels: {
                foundation: 'Helse',
                ability: 'Dash',
                combat_style: 'Egenskaper'
            }
        },
    ],
    exclusiveUpgradeIds: [
        // ILDMAGI
        'fire_damage', 'fire_radius', 'fire_speed', 'fire_chain', 'massiv_eksplosjon',
        // FROSTMAGI
        'frost_damage', 'frost_radius', 'frost_slow', 'frost_shatter',
        // TORDENMAGI
        'lightning_damage', 'lightning_bounces', 'lightning_stun', 'lightning_voltage',
        // EVNER
        'cascade_duration', 'cascade_radius', 'cascade_damage',
        'manaring', 'elementar_overfload', 'nullifikasjon',
        'spell_echo', 'overload', 'arcane_insight', 'mana_shield',
        // SYNERGI
        'thermal_shock', 'frozen_lightning', 'blaze_storm', 'absolute_zero', 'magic_soul_link',
    ],
};

const SKALD: ClassConfig = {
    id: 'skald',
    displayName: 'Skald',
    tagline: 'Rytme · Vers · Makt',
    description:
        'Slagmarkens poet. Skalden angriper på avstand med harpe og runebolt, ' +
        'og bygger Vers som låser opp ødeleggende Kvad-utbrudd. ' +
        'Hold rytmen — eller mist alt.',
    color: '#d4a017',
    accentColor: '#f5d442',
    particleColor: '#ffd700',
    baseStats: {
        hp: 1.10,       // +10% Maks HP
        damage: 1.05,   // +5% Skade
        speed: 1.10,    // +10% Fart
        armor: 1,       // +1 flat rustning
    },
    startingWeapons: ['harp_bolt', 'vers_bolt'],
    classAbilityId: 'seierskvad',
    classAbilityHotkey: '4',
    traits: ['Rytmisk kamp', 'Vers-kraft', 'Inspirerende'],
    portrait: 'assets/ui/portraits/skald_portrait.png',
    shopCategories: [
        {
            id: 'skald_harpe',
            label: 'HARPE',
            icon: 'item_harp',
            isExclusive: true,
            chapterLabels: {
                foundation: 'Harpe'
            }
        },
        {
            id: 'skald_vers',
            label: 'VERS',
            icon: 'item_lute',
            isExclusive: true,
            chapterLabels: {
                foundation: 'Stridssang & Vers'
            }
        },
        {
            id: 'skald_kvad',
            label: 'PANFLØYTE',
            icon: 'item_panflute',
            isExclusive: true,
            chapterLabels: {
                ability: 'Panfløyte',
                combat_style: 'Panfløyte-Synergier'
            }
        },
        {
            id: 'skald_rytme',
            label: 'RYTME',
            icon: 'item_harp',
            isExclusive: true,
            chapterLabels: {
                foundation: 'Rytme',
                combat_style: 'Harmoni',
                ability: 'Crescendo'
            }
        },
        {
            id: 'karakter',
            label: 'KARAKTER',
            icon: 'item_heart_status',
            isExclusive: false,
            chapterLabels: {
                foundation: 'Helse',
                ability: 'Dash',
                combat_style: 'Egenskaper'
            }
        },
    ],
    exclusiveUpgradeIds: [
        // KVAD
        'vers_damage', 'sonic_damage', 'sonic_pierce', 'kvad_radius', 'kvad_duration',
        'poetisk_lisens', 'blodkvad', 'krigsbarde', 'ekko',
        // RYTME
        'stridssang_slow', 'skaldsang_lifesteal', 'resonans_shield', 'crescendo', 'anthem_of_fury',
    ],
};

// ─── Exported Map ─────────────────────────────────────────────────────────────

export const CLASS_CONFIGS: Record<ClassId, ClassConfig> = {
    krieger: KRIEGER,
    archer: ARCHER,
    wizard: WIZARD,
    skald: SKALD,
};

/** Delt KARAKTER-kategori-ID (brukes av alle klasser) */
export const SHARED_CATEGORY_ID = 'karakter' as const;
