import { GAME_CONFIG } from './GameConfig';
import type { ClassId } from './classes';

export type UpgradeCategory = 'Karakter' | 'Sverd' | 'Bue' | 'Magi' | 'Synergi' | 'Kvad' | 'Rytme';

export type ChapterId =
    | 'unlock'        // Opplåsning: Unlock cards always rendered first
    | 'foundation'    // Grunnlag: Passive stats (HP, Armor, Speed)
    | 'combat_style'  // Kampstil: Global behavior (Lifesteal, Crit, Retaliation)
    | 'ability'       // Spesialitet: Class-specific active skills (Virvelvind)
    | 'synergy'       // Synergi: Elemental/Skill interactions
    | 'uncategorized';

export interface ChapterDef {
    id: ChapterId;
    label: string;
    order: number;
    loreText: string;
    themeColor: string;
}

export const CHAPTER_DEFINITIONS: Record<ChapterId, ChapterDef> = {
    unlock: { id: 'unlock', label: 'Opplåsning', order: 0, loreText: 'Nøkkelen til nye evner.', themeColor: '#b8860b' }, // Dark Gold
    foundation: { id: 'foundation', label: 'Grunnlag', order: 1, loreText: 'Det som holder deg i live.', themeColor: '#8b7355' }, // Muted Bronze
    combat_style: { id: 'combat_style', label: 'Kampstil', order: 2, loreText: 'Måten du fører strid på.', themeColor: '#b71c1c' }, // Deep Crimson
    ability: { id: 'ability', label: 'Spesialitet', order: 3, loreText: 'Dine unike kraftuttrykk.', themeColor: '#4a148c' }, // Deep Purple
    synergy: { id: 'synergy', label: 'Synergi', order: 4, loreText: 'Når elementene forenes.', themeColor: '#00695c' }, // Deep Emerald/Teal
    uncategorized: { id: 'uncategorized', label: 'Diverse', order: 99, loreText: 'Uklassifisert lærdom.', themeColor: '#455a64' }, // Slate Blue/Grey
};

export interface UpgradeValue {
    prefix?: string;
    suffix?: string;
    getValue: (level: number) => number | string;
    isReduction?: boolean;
}

export interface UpgradeConfig {
    id: string;
    title: string;
    icon: string;
    category: UpgradeCategory;
    summary: string; // Brief one-liner description of the effect
    value: UpgradeValue; // Structured value for Now -> Next transitions
    maxLevel: number;
    basePrice: number;
    priceScale: number; // Cost = basePrice * (currentLevel ^ priceScale)
    iconTint?: string; // Optional CSS filter or color for the icon
    requires?: Record<string, number>; // Record<upgradeId, requiredLevel>
    /** undefined = shared (alle klasser ser den). Satt = kun den klassen. */
    classRestriction?: ClassId;
    /** Hvilken ShopCategoryDef.id denne tilhører. Udefinert = avled fra category.toLowerCase() */
    shopCategoryId?: string;
    /** Kapittel-inndeling for visning i boken */
    chapterId?: ChapterId;
    /** Detaljert mekanisk forklaring — vises i hover-tooltip for komplekse oppgraderinger */
    detailedDescription?: string;
    /** Krever bekreftelse fra spilleren før kjøp (f.eks. Elementær Konvergens) */
    purchaseWarning?: string;
}

/**
 * Returns a human-readable label for what the player gains by buying the next level.
 * E.g. "+10%", "+20 HP", "−0.5 sek". Returns null for binary (Aktiv/Låst) upgrades.
 */
export function getUpgradeDeltaLabel(upgrade: UpgradeConfig, currentLevel: number): string | null {
    const current = upgrade.value.getValue(currentLevel);
    const next = upgrade.value.getValue(currentLevel + 1);

    const currentNum = typeof current === 'string' ? parseFloat(current) : current;
    const nextNum = typeof next === 'string' ? parseFloat(next) : next;

    if (isNaN(currentNum) || isNaN(nextNum)) return null;

    const delta = Math.abs(nextNum - currentNum);
    const suffix = upgrade.value.suffix ?? '';
    const sign = upgrade.value.isReduction ? '−' : '+';
    const formatted = Number.isInteger(delta) ? String(delta) : delta.toFixed(1);
    return `${sign}${formatted}${suffix}`;
}

export const UPGRADES: UpgradeConfig[] = [
    // --- KARAKTER ---
    {
        id: 'health',
        title: 'Vitalitet',
        icon: 'item_heart_status',
        category: 'Karakter',
        chapterId: 'foundation',
        summary: 'Øker maksimal helse',
        value: { suffix: ' HP', getValue: (lvl) => GAME_CONFIG.PLAYER.BASE_MAX_HP + lvl * 20 },
        maxLevel: 20,
        basePrice: 40,
        priceScale: 1.5,
    },
    {
        id: 'speed',
        title: 'Lynrask',
        icon: 'item_lightning',
        category: 'Karakter',
        chapterId: 'combat_style',
        summary: 'Øker løpehastighet',
        value: { getValue: (lvl) => GAME_CONFIG.PLAYER.BASE_SPEED + lvl * 10 },
        maxLevel: 10,
        basePrice: 50,
        priceScale: 1.6,
    },
    {
        id: 'regen',
        title: 'Trollblod',
        icon: 'item_potion_red',
        category: 'Karakter',
        chapterId: 'foundation',
        summary: 'Gjenoppretter helse over tid',
        value: { suffix: ' HP/s', getValue: (lvl) => lvl },
        maxLevel: 10,
        basePrice: 100,
        priceScale: 1.8,
    },
    {
        id: 'armor',
        title: 'Jernhud',
        icon: 'item_shield',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_rustning',
        chapterId: 'foundation',
        summary: 'Reduserer mottatt skade',
        value: { getValue: (lvl) => lvl },
        maxLevel: 10,
        basePrice: 75,
        priceScale: 1.7,
    },
    // --- DASH ---
    {
        id: 'dash_cooldown',
        title: 'Vindstøt',
        icon: 'item_lightning',
        category: 'Karakter',
        chapterId: 'ability',
        summary: 'Reduserer ventetid på dash',
        value: {
            suffix: ' sek',
            isReduction: true,
            getValue: (lvl) => (GAME_CONFIG.PLAYER.DASH_COOLDOWN_MS / 1000 / (1 + lvl * 0.2)).toFixed(1)
        },
        maxLevel: 6,
        basePrice: 80,
        priceScale: 1.7,
    },
    {
        id: 'dash_distance',
        title: 'Lynskritt',
        icon: 'item_lightning',
        category: 'Karakter',
        chapterId: 'ability',
        summary: 'Øker lengden på dash',
        value: { suffix: 'px', getValue: (lvl) => GAME_CONFIG.PLAYER.DASH_DISTANCE + lvl * 50 },
        maxLevel: 5,
        basePrice: 100,
        priceScale: 1.8,
    },
    {
        id: 'dash_lifesteal',
        title: 'Blodsug',
        icon: 'item_potion_red',
        category: 'Karakter',
        chapterId: 'ability',
        summary: 'Gjenoppretter helse ved hver dash',
        value: { prefix: '+', suffix: ' HP', getValue: (lvl) => lvl * 5 },
        maxLevel: 3,
        basePrice: 180,
        priceScale: 2.0,
    },

    // --- SVERD (Krieger-eksklusiv) ---
    {
        id: 'damage',
        title: 'Skarpt Stål',
        icon: 'item_sword',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_sverd',
        chapterId: 'foundation',
        summary: 'Øker all nærkampskade',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 10 },
        maxLevel: 20,
        basePrice: 60,
        priceScale: 1.5,
    },
    {
        id: 'knockback',
        title: 'Tungt Slag',
        icon: 'item_sword_heavy',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_sverd',
        chapterId: 'foundation',
        summary: 'Slår fiender lenger bakover',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 15 },
        maxLevel: 10,
        basePrice: 50,
        priceScale: 1.4,
    },
    {
        id: 'attack_speed',
        title: 'Berserk',
        icon: 'item_swords_crossed',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_sverd',
        chapterId: 'foundation',
        summary: 'Øker angrepshastighet',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 10 },
        maxLevel: 10,
        basePrice: 80,
        priceScale: 1.6,
    },

    // --- BUE (Archer-eksklusiv) ---
    {
        id: 'bow_cooldown',
        title: 'Rask Trekking',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_bue',
        chapterId: 'foundation',
        summary: 'Reduserer ladetid for bue',
        value: { prefix: '-', suffix: '%', isReduction: true, getValue: (lvl) => lvl * 10 },
        maxLevel: 10,
        basePrice: 60,
        priceScale: 1.5,
    },
    {
        id: 'multishot',
        title: 'Flerskudd',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_bue',
        chapterId: 'combat_style',
        summary: 'Skyter flere piler samtidig',
        value: { suffix: ' piler', getValue: (lvl) => 1 + lvl },
        maxLevel: 5,
        basePrice: 250,
        priceScale: 2.5,
    },
    {
        id: 'pierce',
        title: 'Gjennomboring',
        icon: 'item_spear',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_bue',
        chapterId: 'combat_style',
        summary: 'Piler går gjennom fiender',
        value: { prefix: '+', getValue: (lvl) => lvl },
        maxLevel: 3,
        basePrice: 300,
        priceScale: 3.0,
    },
    {
        id: 'arrow_damage',
        title: 'Skarpere Piler',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_bue',
        chapterId: 'foundation',
        summary: 'Øker pilskade',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 15 },
        maxLevel: 8,
        basePrice: 80,
        priceScale: 1.8,
    },
    {
        id: 'arrow_speed',
        title: 'Lynrask Pil',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_bue',
        chapterId: 'foundation',
        summary: 'Øker pilhastighet',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 20 },
        maxLevel: 5,
        basePrice: 70,
        priceScale: 1.6,
    },
    {
        id: 'explosive_arrow',
        title: 'Eksplosive Piler',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_bue',
        chapterId: 'ability',
        summary: 'Piler eksploderer ved treff',
        value: { suffix: 'px radius', getValue: (lvl) => lvl > 0 ? 80 + (lvl - 1) * 50 : 0 },
        maxLevel: 3,
        basePrice: 400,
        priceScale: 2.5,
    },
    {
        id: 'bow_singularity',
        title: 'Singularitetspil',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_bue',
        chapterId: 'ability',
        summary: 'Piler skaper et kaskade-felt',
        value: { suffix: 'px radius', getValue: (lvl: number) => 150 + lvl * 30 },
        maxLevel: 3,
        basePrice: 1000,
        priceScale: 2.5,
    },

    // --- MAGI (Fireball – Wizard-eksklusiv) ---
    {
        id: 'fire_damage',
        title: 'Brannskade',
        icon: 'item_magic_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_ild',
        summary: 'Øker skade fra ildstav',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 15 },
        maxLevel: 10,
        basePrice: 70,
        priceScale: 1.6,
    },
    {
        id: 'fire_radius',
        title: 'Eksplosiv Kraft',
        icon: 'item_magic_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_ild',
        summary: 'Øker eksplosjonsradius',
        value: { suffix: 'px', getValue: (lvl) => GAME_CONFIG.WEAPONS.FIREBALL.splashRadius + lvl * 30 },
        maxLevel: 5,
        basePrice: 120,
        priceScale: 1.8,
    },
    {
        id: 'fire_speed',
        title: 'Lynild',
        icon: 'item_magic_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_ild',
        summary: 'Øker farten på ildkuler',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 15 },
        maxLevel: 8,
        basePrice: 80,
        priceScale: 1.5,
    },
    {
        id: 'fire_chain',
        title: 'Kjedereaksjon',
        icon: 'item_magic_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_ild',
        summary: 'Eksplosjoner sprer seg til andre fiender',
        value: { getValue: (lvl) => lvl > 0 ? 'Aktiv' : 'Låst' },
        maxLevel: 3,
        basePrice: 300,
        priceScale: 2.5,
    },

    // --- MAGI (Frost – Wizard-eksklusiv) ---
    {
        id: 'frost_damage',
        title: 'Iskald Makt',
        icon: 'item_frost_orb',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_frost',
        summary: 'Øker skade fra froststav',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 15 },
        maxLevel: 10,
        basePrice: 70,
        priceScale: 1.6,
        requires: { unlock_frost: 1 },
    },
    {
        id: 'frost_radius',
        title: 'Frysebølge',
        icon: 'item_frost_orb',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_frost',
        summary: 'Øker rekkevidden på frost',
        value: { suffix: 'px', getValue: (lvl) => GAME_CONFIG.WEAPONS.FROST.radius + lvl * 20 },
        maxLevel: 5,
        basePrice: 120,
        priceScale: 1.8,
    },
    {
        id: 'frost_slow',
        title: 'Permafrost',
        icon: 'item_frost_orb',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_frost',
        summary: 'Forlenger frysetiden',
        value: { suffix: ' sek', getValue: (lvl) => (1000 + lvl * 800) / 1000 },
        maxLevel: 5,
        basePrice: 150,
        priceScale: 2.0,
    },
    {
        id: 'frost_shatter',
        title: 'Isknusing',
        icon: 'item_frost_orb',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_frost',
        summary: 'Frosne fiender tar mer skade',
        value: { getValue: (lvl) => lvl > 0 ? 'Aktiv' : 'Låst' },
        maxLevel: 3,
        basePrice: 350,
        priceScale: 2.8,
    },

    // --- MAGI (Lightning – Wizard-eksklusiv) ---
    {
        id: 'lightning_damage',
        title: 'Tordenstyrke',
        icon: 'item_lightning_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_torden',
        summary: 'Øker skade fra lynstav',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 15 },
        maxLevel: 10,
        basePrice: 70,
        priceScale: 1.6,
        requires: { unlock_lightning: 1 },
    },
    {
        id: 'lightning_bounces',
        title: 'Kjedeblunk',
        icon: 'item_lightning_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_torden',
        summary: 'Lyn spretter til flere mål',
        value: { suffix: ' mål', getValue: (lvl) => 1 + lvl },
        maxLevel: 5,
        basePrice: 200,
        priceScale: 2.0,
    },
    {
        id: 'lightning_stun',
        title: 'Statisk utladning',
        icon: 'item_lightning_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_torden',
        summary: 'Lyn har sjanse til å stumme fiender',
        value: { suffix: '% sjanse', getValue: (lvl) => lvl * 10 },
        maxLevel: 5,
        basePrice: 150,
        priceScale: 1.8,
    },
    {
        id: 'lightning_voltage',
        title: 'Høyspenning',
        icon: 'item_lightning_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_torden',
        summary: 'Øker skade per sprett',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 15 },
        maxLevel: 3,
        basePrice: 200,
        priceScale: 2.2,
    },
    {
        id: 'poison_arrow',
        title: 'Giftpil',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_bue',
        chapterId: 'ability',
        summary: 'Piler forgifter fiender',
        value: { suffix: ' tikk', getValue: (lvl) => lvl > 0 ? [4, 6, 8][lvl - 1] : 0 },
        maxLevel: 3,
        basePrice: 500,
        priceScale: 2.5,
        iconTint: 'hue-rotate(80deg) brightness(1.1) drop-shadow(0 0 2px #00cc44)'
    },
    {
        id: 'magic_soul_link',
        title: 'Sjelelenke',
        icon: 'item_lightning_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_synergi',
        summary: 'Kobler fiender sammen så de deler skade',
        value: { getValue: (lvl) => lvl > 0 ? 'Aktiv' : 'Låst' },
        maxLevel: 1,
        basePrice: 1500,
        priceScale: 1,
        iconTint: 'hue-rotate(140deg) brightness(1.2) drop-shadow(0 0 2px #ff00ff)'
    },
    {
        id: 'sword_eclipse',
        title: 'Solsnu',
        icon: 'item_sword',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_sverd',
        chapterId: 'synergy',
        summary: 'Etterlater en mørk sti som skader fiender',
        value: { suffix: '% skade', getValue: (lvl) => 30 * lvl },
        maxLevel: 3,
        basePrice: 1200,
        priceScale: 2.2,
    },

    // --- SYNERGIER (Wizard-eksklusiv) ---
    {
        id: 'thermal_shock',
        title: 'Thermal Shock',
        icon: 'item_synergy_rune',
        category: 'Synergi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_synergi',
        summary: 'Konsumerer frys for å utløse eksplosivt sjokk',
        value: { getValue: (lvl) => lvl > 0 ? 'Aktiv' : 'Låst' },
        maxLevel: 1,
        basePrice: 500,
        priceScale: 1,
        iconTint: 'drop-shadow(0 0 4px #ff5500) hue-rotate(45deg)',
        requires: {
            'fire_damage': 3,
            'frost_slow': 3
        }
    },

    // --- DELTE (nye) ---
    {
        id: 'coin_magnet',
        title: 'Gullmagneten',
        icon: 'item_coin',
        category: 'Karakter',
        chapterId: 'combat_style',
        summary: 'Øker rekkevidden for å plukke opp gull',
        value: { prefix: '+', suffix: 'px', getValue: (lvl) => lvl * 50 },
        maxLevel: 5,
        basePrice: 90,
        priceScale: 1.6,
    },
    {
        id: 'crit_chance',
        title: 'Skarpeskytte',
        icon: 'item_swords_crossed',
        category: 'Karakter',
        chapterId: 'combat_style',
        summary: 'Øker sjanse for kritiske treff',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 5 },
        maxLevel: 6,
        basePrice: 120,
        priceScale: 1.9,
    },
    {
        id: 'frost_trap',
        title: 'Frostfelle',
        icon: 'item_frost_orb',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_bue',
        chapterId: 'synergy',
        summary: 'Legger ut feller som fryser fiender',
        value: { suffix: ' sek', getValue: (lvl) => 1.5 + lvl * 0.5 },
        maxLevel: 5,
        basePrice: 200,
        priceScale: 1.8,
    },
];

export function isItemSpriteIcon(icon: string): icon is `item_${string}` {
    return icon.startsWith('item_');
}
