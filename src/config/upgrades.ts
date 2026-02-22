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
        icon: 'm-icon-plus-small',
        category: 'Karakter',
        maxLevel: 20,
        basePrice: 40,
        priceScale: 1.5,
        description: (lvl) => `+20 Maks HP (Nå: ${100 + (lvl) * 20})`
    },
    {
        id: 'speed',
        title: 'Lynrask',
        icon: 'm-icon-plus-small',
        category: 'Karakter',
        maxLevel: 10,
        basePrice: 50,
        priceScale: 1.6,
        description: (lvl) => `+10 Fart (Nå: ${250 + (lvl) * 10})`
    },
    {
        id: 'regen',
        title: 'Trollblod',
        icon: 'm-icon-candle',
        category: 'Karakter',
        maxLevel: 10,
        basePrice: 100,
        priceScale: 1.8,
        description: (lvl) => `+1 HP/sek (Nå: ${lvl} HP/s)`
    },
    {
        id: 'armor',
        title: 'Jernhud',
        icon: 'm-icon-shield', // Assuming shield icon exists or using general
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
        icon: 'm-icon-sword',
        category: 'Sverd',
        maxLevel: 20,
        basePrice: 60,
        priceScale: 1.5,
        description: (lvl) => `+10% Skade (Nå: +${lvl * 10}%)`
    },
    {
        id: 'knockback',
        title: 'Tungt Slag',
        icon: 'm-icon-sword',
        category: 'Sverd',
        maxLevel: 10,
        basePrice: 50,
        priceScale: 1.4,
        description: (lvl) => `+15% Knockback (Nå: +${lvl * 15}%)`
    },
    {
        id: 'attack_speed',
        title: 'Berserk',
        icon: 'm-icon-sword',
        category: 'Sverd',
        maxLevel: 10,
        basePrice: 80,
        priceScale: 1.6,
        description: (lvl) => `+10% Angrepsfart (Nå: +${lvl * 10}%)`
    },

    // --- BUE ---
    {
        id: 'unlock_bow',
        title: 'Bueskytter',
        icon: 'm-icon-bow',
        category: 'Bue',
        maxLevel: 1,
        basePrice: 200,
        priceScale: 1,
        description: () => 'Lås opp buen som våpen. Trykk [2] for å bytte.'
    },
    {
        id: 'bow_cooldown',
        title: 'Rask Trekking',
        icon: 'm-icon-bow',
        category: 'Bue',
        maxLevel: 10,
        basePrice: 60,
        priceScale: 1.5,
        description: (lvl) => `-10% Ladetid (Nå: -${lvl * 10}%)`
    },
    {
        id: 'multishot',
        title: 'Flerskudd',
        icon: 'm-icon-bow',
        category: 'Bue',
        maxLevel: 5,
        basePrice: 250,
        priceScale: 2.5, // Expensive!
        description: (lvl) => `+1 Pil (Nå: ${1 + lvl} piler)`
    },
    {
        id: 'pierce',
        title: 'Gjennomboring',
        icon: 'm-icon-bow',
        category: 'Bue',
        maxLevel: 3,
        basePrice: 300,
        priceScale: 3.0,
        description: (lvl) => `Går gjennom +1 fiende (Nå: ${lvl})`
    },

    // --- MAGI (Locked for now) ---
    {
        id: 'magic_bolt',
        title: 'Ukjent Kraft',
        icon: 'm-icon-candle',
        category: 'Magi',
        maxLevel: 1,
        basePrice: 9999,
        priceScale: 1,
        description: () => 'Du føler en magisk tilstedeværelse...'
    }
];
