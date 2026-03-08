/**
 * Paragon-exclusive upgrades — gated behind Paragon tier requirements.
 * These appear in the FantasyBook under a special "PARAGON" shop category.
 *
 * Each upgrade has a `paragonRequired` field indicating the minimum Paragon level
 * needed to purchase it.
 */

import type { UpgradeConfig, ChapterId } from './upgrades';

export interface ParagonUpgradeConfig extends UpgradeConfig {
    /** Minimum Paragon tier required to see/buy this upgrade */
    paragonRequired: number;
}

/** Chapter ID used exclusively for Paragon upgrades */
export const PARAGON_CHAPTER_ID = 'paragon' as ChapterId;

export const PARAGON_UPGRADES: ParagonUpgradeConfig[] = [
    // ─── Paragon 1: Foundation Power ────────────────────────────────────
    {
        id: 'paragon_vitality',
        title: 'Udødelig Vitalitet',
        icon: 'item_heart_status',
        category: 'Karakter',
        summary: 'Massivt HP-løft som vokser per nivå',
        value: { prefix: '+', suffix: ' Max HP', getValue: (lvl) => lvl * 50 },
        maxLevel: 10,
        basePrice: 2000,
        priceScale: 2.0,
        shopCategoryId: 'paragon',
        chapterId: 'foundation',
        paragonRequired: 1,
    },
    {
        id: 'paragon_might',
        title: 'Eldgammel Styrke',
        icon: 'item_sword',
        category: 'Karakter',
        summary: 'Øker all skade permanent',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 8 },
        maxLevel: 10,
        basePrice: 2500,
        priceScale: 2.0,
        shopCategoryId: 'paragon',
        chapterId: 'foundation',
        paragonRequired: 1,
    },
    {
        id: 'paragon_swiftness',
        title: 'Vindens Velsignelse',
        icon: 'item_lightning',
        category: 'Karakter',
        summary: 'Øker bevegelseshastighet',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 5 },
        maxLevel: 5,
        basePrice: 1500,
        priceScale: 1.8,
        shopCategoryId: 'paragon',
        chapterId: 'foundation',
        paragonRequired: 1,
    },

    // ─── Paragon 2: Combat Mastery ──────────────────────────────────────
    {
        id: 'paragon_crit_mastery',
        title: 'Kritisk Mestring',
        icon: 'item_swords_crossed',
        category: 'Karakter',
        summary: 'Øker kritisk skade-multiplikator',
        value: { prefix: '+', suffix: '% krit skade', getValue: (lvl) => lvl * 15 },
        maxLevel: 5,
        basePrice: 3000,
        priceScale: 2.2,
        shopCategoryId: 'paragon',
        chapterId: 'combat_style',
        paragonRequired: 2,
    },
    {
        id: 'paragon_lifesteal',
        title: 'Blodtørst',
        icon: 'item_heart_status',
        category: 'Karakter',
        summary: 'Heler HP ved å drepe fiender',
        value: { prefix: '+', suffix: ' HP per drap', getValue: (lvl) => lvl * 3 },
        maxLevel: 8,
        basePrice: 2000,
        priceScale: 1.9,
        shopCategoryId: 'paragon',
        chapterId: 'combat_style',
        paragonRequired: 2,
        iconTint: 'hue-rotate(280deg)',
    },
    {
        id: 'paragon_thorns',
        title: 'Torneskjold',
        icon: 'item_shield',
        category: 'Karakter',
        summary: 'Reflekterer skade tilbake til angripere',
        value: { prefix: '', suffix: '% reflektert', getValue: (lvl) => lvl * 5 },
        maxLevel: 5,
        basePrice: 3500,
        priceScale: 2.0,
        shopCategoryId: 'paragon',
        chapterId: 'combat_style',
        paragonRequired: 2,
    },

    // ─── Paragon 3: Elemental Affinity ──────────────────────────────────
    {
        id: 'paragon_elemental_mastery',
        title: 'Elementær Overlegenhet',
        icon: 'item_synergy_rune',
        category: 'Karakter',
        summary: 'Øker all elementskade (ild, frost, lyn)',
        value: { prefix: '+', suffix: '%', getValue: (lvl) => lvl * 10 },
        maxLevel: 5,
        basePrice: 5000,
        priceScale: 2.5,
        shopCategoryId: 'paragon',
        chapterId: 'synergy',
        paragonRequired: 3,
    },
    {
        id: 'paragon_gold_find',
        title: 'Dragens Skatt',
        icon: 'item_gold_coin',
        category: 'Karakter',
        summary: 'Øker gull fra alle kilder',
        value: { prefix: '+', suffix: '% gull', getValue: (lvl) => lvl * 10 },
        maxLevel: 10,
        basePrice: 2000,
        priceScale: 1.7,
        shopCategoryId: 'paragon',
        chapterId: 'foundation',
        paragonRequired: 3,
    },

    // ─── Paragon 4: Advanced ────────────────────────────────────────────
    {
        id: 'paragon_cooldown_mastery',
        title: 'Tidsmanipulering',
        icon: 'item_lightning_staff',
        category: 'Karakter',
        summary: 'Reduserer alle cooldowns',
        value: { prefix: '-', suffix: '%', getValue: (lvl) => lvl * 4, isReduction: true },
        maxLevel: 5,
        basePrice: 6000,
        priceScale: 2.5,
        shopCategoryId: 'paragon',
        chapterId: 'ability',
        paragonRequired: 4,
    },
    {
        id: 'paragon_second_wind',
        title: 'Andre Vind',
        icon: 'item_heart_status',
        category: 'Karakter',
        summary: 'Sjanse til å overleve dødelig skade med 1 HP',
        value: { prefix: '', suffix: '% sjanse', getValue: (lvl) => lvl * 5 },
        maxLevel: 4,
        basePrice: 8000,
        priceScale: 2.0,
        shopCategoryId: 'paragon',
        chapterId: 'ability',
        paragonRequired: 4,
        iconTint: 'hue-rotate(120deg)',
    },

    // ─── Paragon 5: Ultimate ────────────────────────────────────────────
    {
        id: 'paragon_aura_of_power',
        title: 'Maktens Aura',
        icon: 'item_synergy_rune',
        category: 'Karakter',
        summary: 'Fiender nær deg tar kontinuerlig skade',
        value: { prefix: '', suffix: ' DPS', getValue: (lvl) => lvl * 15 },
        maxLevel: 5,
        basePrice: 10000,
        priceScale: 2.5,
        shopCategoryId: 'paragon',
        chapterId: 'synergy',
        paragonRequired: 5,
        iconTint: 'hue-rotate(45deg) saturate(1.5)',
    },
    {
        id: 'paragon_executioner',
        title: 'Bøddelen',
        icon: 'item_swords_crossed',
        category: 'Karakter',
        summary: 'Instant-drep fiender under en viss HP-terskel',
        value: { prefix: '<', suffix: '% HP', getValue: (lvl) => lvl * 3 },
        maxLevel: 5,
        basePrice: 12000,
        priceScale: 2.5,
        shopCategoryId: 'paragon',
        chapterId: 'combat_style',
        paragonRequired: 5,
        iconTint: 'hue-rotate(330deg)',
    },
];
