/**
 * CLASS-EXCLUSIVE UPGRADES
 * Fase 1: Alle nye upgrades som BARE én klasse kan kjøpe.
 *
 * Extends UpgradeConfig med:
 *   classRestriction: ClassId   – alltid satt (aldri undefined her)
 *   isAbilityUpgrade?: boolean  – true = påvirker class-ability direkte
 *
 * Kategorier per klasse:
 *   Krieger  → DRIVKRAFT / MASTRING / KAMPTALENT / RUSTNING
 *   Archer   → DRIVKRAFT / MASTRING / TALENTER / SMIDIGHET
 *   Wizard   → DRIVKRAFT / MASTRING / SYNERGI / ARKAN KUNNSKAP
 */

import type { UpgradeConfig } from './upgrades';
import type { ClassId } from './classes';

export interface ClassUpgradeConfig extends UpgradeConfig {
    classRestriction: ClassId;
    isAbilityUpgrade?: boolean;
    shopCategoryId: string;
}

// ─── KRIEGER ─────────────────────────────────────────────────────────────────

/** Krieger DRIVKRAFT: Whirlwind Slash ability-nivåer + legendaries */
const KRIEGER_DRIVKRAFT: ClassUpgradeConfig[] = [
    {
        id: 'whirl_damage',
        title: 'Skarpe Kniver',
        icon: 'item_sword',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_drivkraft',
        isAbilityUpgrade: true,
        maxLevel: 3,
        basePrice: 200,
        priceScale: 2.2,
        iconTint: 'drop-shadow(0 0 5px #cc4400) hue-rotate(-10deg)',
        description: (lvl) => `+${lvl * 25}% Virvelvind-skade (Nå: ${100 + lvl * 25}%)`,
    },
    {
        id: 'whirl_cooldown',
        title: 'Rotasjonsfart',
        icon: 'item_swords_crossed',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_drivkraft',
        isAbilityUpgrade: true,
        maxLevel: 3,
        basePrice: 250,
        priceScale: 2.5,
        iconTint: 'drop-shadow(0 0 5px #cc4400) hue-rotate(-10deg)',
        requires: { whirl_damage: 1 },
        description: (lvl) => {
            const cd = [6.4, 5.1, 4.1][lvl - 1] ?? 8;
            return `-20% Virvelvind-CD per nivå (Nå: ${cd}s)`;
        },
    },
    {
        id: 'whirl_chain',
        title: 'Eksplosiv Sekvens',
        icon: 'item_swords_crossed',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_drivkraft',
        isAbilityUpgrade: true,
        maxLevel: 2,
        basePrice: 500,
        priceScale: 2.8,
        iconTint: 'drop-shadow(0 0 5px #cc4400) hue-rotate(-10deg)',
        requires: { whirl_cooldown: 2 },
        description: (lvl) =>
            lvl === 1
                ? 'Hvert treff → -5% CD (maks -25%)'
                : 'Hvert treff → -7% CD (maks -35%)',
    },
    {
        id: 'berserker_rage',
        title: 'Berserkerfurie',
        icon: 'item_sword_heavy',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_drivkraft',
        maxLevel: 3,
        basePrice: 300,
        priceScale: 2.5,
        iconTint: 'drop-shadow(0 0 5px #cc4400) hue-rotate(-10deg)',
        description: (lvl) => `+${lvl * 5}% skade per 20% HP tapt`,
    },
    {
        id: 'livsstaling',
        title: 'Livsstaling',
        icon: 'item_potion_red',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_drivkraft',
        maxLevel: 4,
        basePrice: 200,
        priceScale: 2.0,
        description: (lvl) => `+${lvl * 8} HP ved hvert fiendedrap (melee)`,
    },
    {
        id: 'blodust',
        title: 'Blodtorne',
        icon: 'item_shield',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_drivkraft',
        maxLevel: 3,
        basePrice: 350,
        priceScale: 2.8,
        requires: { armor: 3 },
        description: (lvl) => `Fiender som treffer deg tar ${lvl * 15}% av skaden i retur`,
    },
];

/** Krieger MASTRING – Sverd-fokus (ekstra nye) */
const KRIEGER_MASTRING_NYE: ClassUpgradeConfig[] = [
    {
        id: 'wide_swing',
        title: 'Bred Svingning',
        icon: 'item_sword',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_mastring',
        maxLevel: 3,
        basePrice: 180,
        priceScale: 2.0,
        description: (lvl) => `+${lvl * 30}% svingebue (treffer bredere AoE)`,
    },
    {
        id: 'heavy_momentum',
        title: 'Tyngdekraft',
        icon: 'item_sword_heavy',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_mastring',
        maxLevel: 3,
        basePrice: 250,
        priceScale: 2.3,
        description: (lvl) =>
            `Hvert sverd-hit øker neste hits skade +${lvl * 10}% (maks ${lvl * 3} stacks)`,
    },
];

/** Krieger KAMPTALENT – Battle-teknikker */
const KRIEGER_KAMPTALENT: ClassUpgradeConfig[] = [
    {
        id: 'counter_strike',
        title: 'Kontraangrep',
        icon: 'item_swords_crossed',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_kamptalent',
        maxLevel: 3,
        basePrice: 300,
        priceScale: 2.5,
        requires: { armor: 2 },
        description: (lvl) => `${lvl * 20}% sjanse å returnere ${lvl * 25}% av mottatt skade`,
    },
    {
        id: 'stomp',
        title: 'Stormtramp',
        icon: 'item_sword_heavy',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_kamptalent',
        maxLevel: 2,
        basePrice: 400,
        priceScale: 3.0,
        requires: { dash_cooldown: 2 },
        description: (lvl) =>
            `Etter dash: mini-AoE ${lvl === 1 ? '0.5s' : '0.8s'} stun rundt spilleren`,
    },
    {
        id: 'battle_cry',
        title: 'Krigsrop',
        icon: 'item_swords_crossed',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_kamptalent',
        maxLevel: 3,
        basePrice: 280,
        priceScale: 2.4,
        description: (lvl) => `Drepe 5 fiender → +${lvl * 15}% skade i 8s (Krigsrush)`,
    },
    {
        id: 'executioner',
        title: 'Bøddel',
        icon: 'item_sword',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_kamptalent',
        maxLevel: 2,
        basePrice: 450,
        priceScale: 2.8,
        requires: { damage: 5 },
        description: (lvl) => `+${lvl * 50}% skade mot fiender under 25% HP`,
    },
];

/** Krieger RUSTNING – Defense-synergier */
const KRIEGER_RUSTNING: ClassUpgradeConfig[] = [
    {
        id: 'skadeskalering',
        title: 'Skadeskalering',
        icon: 'item_shield',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_rustning',
        maxLevel: 3,
        basePrice: 220,
        priceScale: 2.2,
        requires: { armor: 3 },
        description: (lvl) => `+${lvl * 5}% skade per rustnings-nivå kjøpt`,
    },
    {
        id: 'utstotbar_slag',
        title: 'Utstøtbar Slag',
        icon: 'item_sword_heavy',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_rustning',
        maxLevel: 2,
        basePrice: 500,
        priceScale: 3.0,
        requires: { knockback: 5 },
        description: () =>
            'Knockback kjedereagerer – fiender treffer hverandre og tar 40% ekstraskade',
    },
    {
        id: 'iron_will',
        title: 'Jernvilje',
        icon: 'item_shield',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_rustning',
        maxLevel: 1,
        basePrice: 800,
        priceScale: 1.0,
        requires: { armor: 6 },
        description: () => 'Overlev ett dødelig angrep med 1 HP (1 gang per level)',
        iconTint: 'drop-shadow(0 0 6px #aaccff) brightness(1.3)',
    },
    {
        id: 'fortification',
        title: 'Befestning',
        icon: 'item_shield',
        category: 'Sverd',
        classRestriction: 'krieger',
        shopCategoryId: 'krieger_rustning',
        maxLevel: 3,
        basePrice: 200,
        priceScale: 2.0,
        description: (lvl) => `Stå stille 2s: +${lvl * 20}% rustning passivt`,
    },
];

// ─── ARCHER ──────────────────────────────────────────────────────────────────

/** Archer DRIVKRAFT: Explosive Shot ability-nivåer + legendaries */
const ARCHER_DRIVKRAFT: ClassUpgradeConfig[] = [
    {
        id: 'exp_shot_radius',
        title: 'Massiv Eksplosjon',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_drivkraft',
        isAbilityUpgrade: true,
        maxLevel: 3,
        basePrice: 220,
        priceScale: 2.3,
        iconTint: 'drop-shadow(0 0 5px #ff6600) hue-rotate(20deg)',
        description: (lvl) => `+${lvl * 40}px eksplosjonradius (Nå: ${120 + lvl * 40}px)`,
    },
    {
        id: 'exp_shot_damage',
        title: 'Dødelig Nøyaktighet',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_drivkraft',
        isAbilityUpgrade: true,
        maxLevel: 3,
        basePrice: 250,
        priceScale: 2.5,
        iconTint: 'drop-shadow(0 0 5px #ff6600) hue-rotate(20deg)',
        requires: { exp_shot_radius: 1 },
        description: (lvl) => {
            const mult = (2.0 + lvl * 0.3).toFixed(1);
            return `+30% skade-multiplikator per nivå (Nå: ${mult}x)`;
        },
    },
    {
        id: 'kaskade_fyring',
        title: 'Kaskadefyring',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_drivkraft',
        isAbilityUpgrade: true,
        maxLevel: 2,
        basePrice: 550,
        priceScale: 3.0,
        iconTint: 'drop-shadow(0 0 5px #ff6600) hue-rotate(20deg)',
        requires: { exp_shot_damage: 2 },
        description: (lvl) =>
            lvl === 1
                ? 'Explosive Shot-treff spawner 2 ekstra piler mot nærmeste'
                : 'Spawner 3 piler, pilepeksplosjoner (+20px radius)',
    },
    {
        id: 'rikosjett',
        title: 'Rikosjett',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_drivkraft',
        maxLevel: 3,
        basePrice: 300,
        priceScale: 2.5,
        description: (lvl) => `Piler spretter til ${lvl} ny fiende etter treff`,
    },
    {
        id: 'fokusert_skudd',
        title: 'Fokusert Skudd',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_drivkraft',
        maxLevel: 2,
        basePrice: 500,
        priceScale: 2.8,
        requires: { arrow_damage: 4 },
        description: (lvl) =>
            lvl === 1
                ? 'Hold angrepsknapp → lad bue (2x skade-multiplikator)'
                : 'Hold angrepsknapp → 2.5x skade + piercende sjanse 40%',
    },
    {
        id: 'shadeskudd',
        title: 'Skuddkaskade',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_drivkraft',
        maxLevel: 3,
        basePrice: 280,
        priceScale: 2.3,
        requires: { multishot: 2 },
        description: (lvl) => `Drepe fiende spawner ${lvl} ekstra pil mot nærmeste`,
    },
];

/** Archer TALENTER – Presisjon */
const ARCHER_TALENTER: ClassUpgradeConfig[] = [
    {
        id: 'headshot',
        title: 'Hodeskudd',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_talenter',
        maxLevel: 3,
        basePrice: 200,
        priceScale: 2.2,
        requires: { crit_chance: 2 },
        description: (lvl) => `+${lvl * 15}% krit-sjanse (kun piler)`,
    },
    {
        id: 'eagle_eye',
        title: 'Ørneøye',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_talenter',
        maxLevel: 3,
        basePrice: 250,
        priceScale: 2.4,
        requires: { arrow_speed: 3 },
        description: (lvl) => `+${lvl * 30}% pilhastighet, +${lvl * 25}% rekkevidde`,
    },
    {
        id: 'pindown',
        title: 'Festepil',
        icon: 'item_spear',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_talenter',
        maxLevel: 3,
        basePrice: 350,
        priceScale: 2.7,
        requires: { pierce: 1 },
        description: (lvl) => `${lvl * 20}% sjanse: pil immobiliserer fiende ${0.5 + lvl}s`,
    },
    {
        id: 'time_slow_arrow',
        title: 'Tempopil',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_talenter',
        maxLevel: 1,
        basePrice: 700,
        priceScale: 1.0,
        requires: { eagle_eye: 2 },
        description: () => 'Spesialpil [E] som bremser alle fiender 40% i 3s (15s CD)',
        iconTint: 'drop-shadow(0 0 6px #00ccff) hue-rotate(160deg)',
    },
];

/** Archer SMIDIGHET – Mobilitet */
const ARCHER_SMIDIGHET: ClassUpgradeConfig[] = [
    {
        id: 'luftmobilitet',
        title: 'Luftmobilitet',
        icon: 'item_lightning',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_smidighet',
        maxLevel: 2,
        basePrice: 350,
        priceScale: 3.0,
        description: (lvl) => `+1 ekstra dash-lading (Nå: ${2 + lvl} totalt)`,
    },
    {
        id: 'aerial_shot',
        title: 'Luftskudd',
        icon: 'item_bow',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_smidighet',
        maxLevel: 2,
        basePrice: 300,
        priceScale: 2.8,
        description: () => 'Skyt mens du dasher: ingen fart-tap ved skyting',
    },
    {
        id: 'shadow_step',
        title: 'Skyggetrinn',
        icon: 'item_lightning',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_smidighet',
        maxLevel: 2,
        basePrice: 400,
        priceScale: 3.0,
        description: (lvl) =>
            `Etter dash: usynlig ${lvl === 1 ? '0.5s' : '1s'} (fiender mister target)`,
    },
    {
        id: 'kite_mastery',
        title: 'Dragemanøver',
        icon: 'item_lightning',
        category: 'Bue',
        classRestriction: 'archer',
        shopCategoryId: 'archer_smidighet',
        maxLevel: 3,
        basePrice: 220,
        priceScale: 2.2,
        description: (lvl) => `Drepe fiende: øyeblikkelig ${lvl * 20}% dash CD refund`,
    },
];

// ─── WIZARD ──────────────────────────────────────────────────────────────────

/** Wizard DRIVKRAFT: Arcane Singularity ability-nivåer + legendaries */
const WIZARD_DRIVKRAFT: ClassUpgradeConfig[] = [
    {
        id: 'singularity_duration',
        title: 'Mørk Materie',
        icon: 'item_magic_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_drivkraft',
        isAbilityUpgrade: true,
        maxLevel: 3,
        basePrice: 250,
        priceScale: 2.4,
        iconTint: 'drop-shadow(0 0 5px #8800ff) hue-rotate(200deg)',
        description: (lvl) => `+${lvl * 0.5}s Singularitet-varighet (Nå: ${3 + lvl * 0.5}s)`,
    },
    {
        id: 'singularity_radius',
        title: 'Hendelseshorisont',
        icon: 'item_magic_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_drivkraft',
        isAbilityUpgrade: true,
        maxLevel: 3,
        basePrice: 280,
        priceScale: 2.5,
        iconTint: 'drop-shadow(0 0 5px #8800ff) hue-rotate(200deg)',
        requires: { singularity_duration: 1 },
        description: (lvl) => `+${lvl * 25}% draradius (Nå: ${100 + lvl * 25}%)`,
    },
    {
        id: 'singularity_damage',
        title: 'Knusende Gravitasjon',
        icon: 'item_lightning_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_drivkraft',
        isAbilityUpgrade: true,
        maxLevel: 2,
        basePrice: 600,
        priceScale: 3.0,
        iconTint: 'drop-shadow(0 0 5px #8800ff) hue-rotate(200deg)',
        requires: { singularity_radius: 2 },
        description: (lvl) =>
            lvl === 1
                ? 'Eksplosjonen gjør +50% skade på fiender i sentrum'
                : 'Eksplosjonen gjør +100% skade på fiender i sentrum',
    },
    {
        id: 'manaring',
        title: 'Manaring',
        icon: 'item_frost_orb',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_drivkraft',
        maxLevel: 2,
        basePrice: 450,
        priceScale: 2.8,
        requires: { singularity_duration: 2 },
        description: (lvl) =>
            `Aktiv Singularitet gir +${lvl === 1 ? 25 : 40}% skade-reduksjon over hele kartet`,
    },
    {
        id: 'elementar_overfload',
        title: 'Elementær Overflod',
        icon: 'item_magic_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_drivkraft',
        maxLevel: 3,
        basePrice: 320,
        priceScale: 2.6,
        description: (lvl) =>
            `Bruk én trolldom: +${lvl * 10}% skade på alle andre i 4s`,
    },
    {
        id: 'nullifikasjon',
        title: 'Magisk Nullifikasjon',
        icon: 'item_frost_orb',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_drivkraft',
        maxLevel: 1,
        basePrice: 900,
        priceScale: 1.0,
        requires: { singularity_damage: 1 },
        description: () =>
            'Kastet trolldom kolliderer med fiendebolt og ødelegger begge',
        iconTint: 'drop-shadow(0 0 8px #8800ff) hue-rotate(200deg) brightness(1.3)',
    },
];

/** Wizard SYNERGI – Trolldomsinteraksjoner */
const WIZARD_SYNERGI: ClassUpgradeConfig[] = [
    {
        id: 'frozen_lightning',
        title: 'Frosset Torden',
        icon: 'item_lightning_staff',
        category: 'Synergi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_synergi',
        maxLevel: 1,
        basePrice: 700,
        priceScale: 1.0,
        requires: { frost_shatter: 2, lightning_stun: 3 },
        description: () =>
            'Frossede fiender fanget av lyn tar 4x skade + splintrer',
        iconTint: 'drop-shadow(0 0 6px #8800ff) hue-rotate(200deg)',
    },
    {
        id: 'blaze_storm',
        title: 'Ildstorm',
        icon: 'item_magic_staff',
        category: 'Synergi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_synergi',
        maxLevel: 2,
        basePrice: 600,
        priceScale: 2.5,
        requires: { fire_chain: 2, lightning_damage: 5 },
        description: () =>
            'Ild + Lyn på samme mål spawner 2s brannfelt',
        iconTint: 'drop-shadow(0 0 6px #8800ff) hue-rotate(200deg)',
    },
    {
        id: 'absolute_zero',
        title: 'Absolutt Null',
        icon: 'item_frost_orb',
        category: 'Synergi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_synergi',
        maxLevel: 1,
        basePrice: 1000,
        priceScale: 1.0,
        requires: { frost_slow: 5, singularity_duration: 2 },
        description: () =>
            'Fullfryst fiende kan kastes som prosjektil mot andre',
        iconTint: 'drop-shadow(0 0 6px #8800ff) hue-rotate(200deg)',
    },
];

/** Wizard MASTRING – Ekstra massiv eksplosjon */
const WIZARD_MASTRING_NYE: ClassUpgradeConfig[] = [
    {
        id: 'massiv_eksplosjon',
        title: 'Massiv Eksplosjon',
        icon: 'item_magic_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_mastring',
        maxLevel: 2,
        basePrice: 500,
        priceScale: 2.5,
        description: (lvl) => `Ildkule-AoE økes til maks (Nå: +${lvl * 40}px radius)`,
    },
];

/** Wizard ARKAN KUNNSKAP – Avanserte trolldomsteknikker */
const WIZARD_ARKAN: ClassUpgradeConfig[] = [
    {
        id: 'spell_echo',
        title: 'Trolldomseko',
        icon: 'item_magic_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_arkan',
        maxLevel: 3,
        basePrice: 300,
        priceScale: 2.5,
        description: (lvl) => `${lvl * 15}% sjanse: kast trolldom uten CD`,
    },
    {
        id: 'overload',
        title: 'Overbelastning',
        icon: 'item_lightning_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_arkan',
        maxLevel: 2,
        basePrice: 400,
        priceScale: 2.8,
        requires: { spell_echo: 2 },
        description: () =>
            'Treffe 3 fiender med ett kast: neste kast er gratis',
    },
    {
        id: 'arcane_insight',
        title: 'Arkan Innsikt',
        icon: 'item_magic_staff',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_arkan',
        maxLevel: 3,
        basePrice: 350,
        priceScale: 2.6,
        description: (lvl) => `Hver 4. kast reduserer CD ${lvl * 30}%`,
    },
    {
        id: 'mana_shield',
        title: 'Manadel',
        icon: 'item_frost_orb',
        category: 'Magi',
        classRestriction: 'wizard',
        shopCategoryId: 'wizard_arkan',
        maxLevel: 2,
        basePrice: 500,
        priceScale: 3.0,
        requires: { armor: 2 },
        description: (lvl) =>
            `Ta skade: ${lvl * 30}% sjanse å absorbe med CD-reduksjon istedet`,
    },
];

// ─── Exported Array ───────────────────────────────────────────────────────────

export const CLASS_UPGRADES: ClassUpgradeConfig[] = [
    // KRIEGER
    ...KRIEGER_DRIVKRAFT,
    ...KRIEGER_MASTRING_NYE,
    ...KRIEGER_KAMPTALENT,
    ...KRIEGER_RUSTNING,
    // ARCHER
    ...ARCHER_DRIVKRAFT,
    ...ARCHER_TALENTER,
    ...ARCHER_SMIDIGHET,
    // WIZARD
    ...WIZARD_DRIVKRAFT,
    ...WIZARD_SYNERGI,
    ...WIZARD_MASTRING_NYE,
    ...WIZARD_ARKAN,
];
