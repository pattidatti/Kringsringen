export type UpgradeCategory = 'Karakter' | 'Sverd' | 'Bue' | 'Magi';

export interface UpgradeConfig {
    id: string;
    title: string;
    icon: string;
    category: UpgradeCategory;
    maxLevel: number;
    basePrice: number;
    priceScale: number; // Cost = basePrice * (currentLevel ^ priceScale)
    description: (level: number) => string;
}

export const UPGRADES: UpgradeConfig[] = [
    // --- KARAKTER ---
    {
        id: 'health',
        title: 'Vitalitet',
        icon: 'item_heart_status',
        category: 'Karakter',
        maxLevel: 20,
        basePrice: 40,
        priceScale: 1.5,
        description: (lvl) => `+20 Maks HP (Nå: ${100 + (lvl) * 20})`
    },
    {
        id: 'speed',
        title: 'Lynrask',
        icon: 'item_lightning',
        category: 'Karakter',
        maxLevel: 10,
        basePrice: 50,
        priceScale: 1.6,
        description: (lvl) => `+10 Fart (Nå: ${250 + (lvl) * 10})`
    },
    {
        id: 'regen',
        title: 'Trollblod',
        icon: 'item_potion_red',
        category: 'Karakter',
        maxLevel: 10,
        basePrice: 100,
        priceScale: 1.8,
        description: (lvl) => `+1 HP/sek (Nå: ${lvl} HP/s)`
    },
    {
        id: 'armor',
        title: 'Jernhud',
        icon: 'item_shield',
        category: 'Karakter',
        maxLevel: 10,
        basePrice: 75,
        priceScale: 1.7,
        description: (lvl) => `+1 Rustning (Nå: ${lvl})`
    },

    // --- SVERD ---
    {
        id: 'damage',
        title: 'Skarpt Stål',
        icon: 'item_sword',
        category: 'Sverd',
        maxLevel: 20,
        basePrice: 60,
        priceScale: 1.5,
        description: (lvl) => `+10% Skade (Nå: +${lvl * 10}%)`
    },
    {
        id: 'knockback',
        title: 'Tungt Slag',
        icon: 'item_sword_heavy',
        category: 'Sverd',
        maxLevel: 10,
        basePrice: 50,
        priceScale: 1.4,
        description: (lvl) => `+15% Knockback (Nå: +${lvl * 15}%)`
    },
    {
        id: 'attack_speed',
        title: 'Berserk',
        icon: 'item_swords_crossed',
        category: 'Sverd',
        maxLevel: 10,
        basePrice: 80,
        priceScale: 1.6,
        description: (lvl) => `+10% Angrepsfart (Nå: +${lvl * 10}%)`
    },

    // --- BUE ---
    {
        id: 'bow_cooldown',
        title: 'Rask Trekking',
        icon: 'item_bow',
        category: 'Bue',
        maxLevel: 10,
        basePrice: 60,
        priceScale: 1.5,
        description: (lvl) => `-10% Ladetid (Nå: -${lvl * 10}%)`
    },
    {
        id: 'multishot',
        title: 'Flerskudd',
        icon: 'item_bow',
        category: 'Bue',
        maxLevel: 5,
        basePrice: 250,
        priceScale: 2.5, // Expensive!
        description: (lvl) => `+1 Pil (Nå: ${1 + lvl} piler)`
    },
    {
        id: 'pierce',
        title: 'Gjennomboring',
        icon: 'item_spear',
        category: 'Bue',
        maxLevel: 3,
        basePrice: 300,
        priceScale: 3.0,
        description: (lvl) => `Går gjennom +1 fiende (Nå: ${lvl})`
    },
    {
        id: 'arrow_damage',
        title: 'Skarpere Piler',
        icon: 'item_bow',
        category: 'Bue',
        maxLevel: 8,
        basePrice: 80,
        priceScale: 1.8,
        description: (lvl) => `+15% Pilskade (Nå: +${lvl * 15}%)`
    },
    {
        id: 'arrow_speed',
        title: 'Lynrask Pil',
        icon: 'item_bow',
        category: 'Bue',
        maxLevel: 5,
        basePrice: 70,
        priceScale: 1.6,
        description: (lvl) => `+20% Pilhastighet (Nå: +${lvl * 20}%)`
    },
    {
        id: 'explosive_arrow',
        title: 'Eksplosive Piler',
        icon: 'item_bow',
        category: 'Bue',
        maxLevel: 3,
        basePrice: 400,
        priceScale: 2.5,
        description: (lvl) => lvl > 0 ? `Eksplosjon ved treff (Radius: ${80 + (lvl - 1) * 50}px)` : 'Piler eksploderer ved treff'
    },

    // --- MAGI (Fireball) ---
    {
        id: 'fire_damage',
        title: 'Brannskade',
        icon: 'item_magic_staff',
        category: 'Magi',
        maxLevel: 10,
        basePrice: 70,
        priceScale: 1.6,
        description: (lvl) => `+15% Ildstav-skade (Nå: +${lvl * 15}%)`
    },
    {
        id: 'fire_radius',
        title: 'Eksplosiv Kraft',
        icon: 'item_magic_staff',
        category: 'Magi',
        maxLevel: 5,
        basePrice: 120,
        priceScale: 1.8,
        description: (lvl) => `+20px eksplosionsradius (Nå: ${80 + lvl * 20}px)`
    },
    {
        id: 'fire_speed',
        title: 'Lynild',
        icon: 'item_magic_staff',
        category: 'Magi',
        maxLevel: 8,
        basePrice: 80,
        priceScale: 1.5,
        description: (lvl) => `+15% prosjektilhastighet (Nå: +${lvl * 15}%)`
    },
    {
        id: 'fire_chain',
        title: 'Kjedereaksjon',
        icon: 'item_magic_staff',
        category: 'Magi',
        maxLevel: 3,
        basePrice: 300,
        priceScale: 2.5,
        description: (lvl) => lvl > 0 ? 'Eksplosjon setter fyr på fiender nær dem' : 'Lås opp kjedereaksjoner'
    },

    // --- MAGI (Frost) ---
    {
        id: 'frost_damage',
        title: 'Iskald Makt',
        icon: 'item_frost_orb',
        category: 'Magi',
        maxLevel: 10,
        basePrice: 70,
        priceScale: 1.6,
        description: (lvl) => `+15% Froststav-skade (Nå: +${lvl * 15}%)`
    },
    {
        id: 'frost_radius',
        title: 'Frysebølge',
        icon: 'item_frost_orb',
        category: 'Magi',
        maxLevel: 5,
        basePrice: 120,
        priceScale: 1.8,
        description: (lvl) => `+20px frysningsradius (Nå: ${100 + lvl * 20}px)`
    },
    {
        id: 'frost_slow',
        title: 'Permafrost',
        icon: 'item_frost_orb',
        category: 'Magi',
        maxLevel: 5,
        basePrice: 150,
        priceScale: 2.0,
        description: (lvl) => `+0.5s frys-tid (Nå: ${1.0 + lvl * 0.5}s)`
    },
    {
        id: 'frost_shatter',
        title: 'Isknusing',
        icon: 'item_frost_orb',
        category: 'Magi',
        maxLevel: 3,
        basePrice: 350,
        priceScale: 2.8,
        description: (lvl) => lvl > 0 ? 'Frosne fiender tar +50% skade og splintrer' : 'Lås opp isknusing'
    },

    // --- MAGI (Lightning) ---
    {
        id: 'lightning_damage',
        title: 'Tordenstyrke',
        icon: 'item_lightning_staff',
        category: 'Magi',
        maxLevel: 10,
        basePrice: 70,
        priceScale: 1.6,
        description: (lvl) => `+15% Lynstav-skade (Nå: +${lvl * 15}%)`
    },
    {
        id: 'lightning_bounces',
        title: 'Kjedeblunk',
        icon: 'item_lightning_staff',
        category: 'Magi',
        maxLevel: 5,
        basePrice: 200,
        priceScale: 2.0,
        description: (lvl) => `+1 ekstra mål (Nå: ${1 + lvl} ekstra mål)`
    },
    {
        id: 'lightning_multicast',
        title: 'Stormskudd',
        icon: 'item_lightning_staff',
        category: 'Magi',
        maxLevel: 3,
        basePrice: 300,
        priceScale: 2.5,
        description: (lvl) => `+1 lyn samtidig (Nå: ${1 + lvl} lyn)`
    }
];

export function isItemSpriteIcon(icon: string): icon is `item_${string}` {
    return icon.startsWith('item_');
}
