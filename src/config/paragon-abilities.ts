/**
 * Paragon Abilities — powerful class-specific abilities unlocked at higher Paragon tiers.
 * These use hotkeys E, F, Q (separate from the 1-4 weapon/ability slots).
 *
 * Mix of entirely new abilities and "mutations" of existing weapons.
 */

import type { ClassId } from './classes';

export type ParagonAbilitySlot = 'E' | 'F' | 'Q';

export interface ParagonAbilityDef {
    id: string;
    name: string;
    description: string;
    icon: string;
    hotkey: ParagonAbilitySlot;
    /** Minimum Paragon tier to unlock */
    paragonRequired: number;
    /** Cooldown in ms */
    cooldown: number;
    /** Duration of effect in ms (0 = instant) */
    duration: number;
    /** Whether this is a "mutation" of an existing weapon vs a new ability */
    type: 'new' | 'mutation';
    /** For mutations: which weapon/ability ID this transforms */
    mutatesFrom?: string;
    /** Class this belongs to */
    classId: ClassId;
    /** Optional tint for the icon */
    iconTint?: string;
}

// ─── Krieger Paragon Abilities ──────────────────────────────────────────────

export const KRIEGER_PARAGON_ABILITIES: ParagonAbilityDef[] = [
    {
        id: 'earthquake_slam',
        name: 'Jordskjelv-Slag',
        description: 'Et massivt bakkestamp som skader og bedøver alle fiender i nærheten.',
        icon: 'item_sword',
        hotkey: 'E',
        paragonRequired: 2,
        cooldown: 12000,
        duration: 0,
        type: 'new',
        classId: 'krieger',
        iconTint: 'hue-rotate(30deg) saturate(1.5)',
    },
    {
        id: 'blood_rage',
        name: 'Blodrus',
        description: '10s buff: +50% skade, +30% fart, men tar 20% mer skade.',
        icon: 'item_swords_crossed',
        hotkey: 'F',
        paragonRequired: 4,
        cooldown: 25000,
        duration: 10000,
        type: 'new',
        classId: 'krieger',
        iconTint: 'hue-rotate(330deg) saturate(2)',
    },
    {
        id: 'titans_shield',
        name: 'Titanens Skjold',
        description: '5s uovervinnelighetsbarriere som reflekterer prosjektiler.',
        icon: 'item_shield',
        hotkey: 'Q',
        paragonRequired: 6,
        cooldown: 45000,
        duration: 5000,
        type: 'new',
        classId: 'krieger',
        iconTint: 'hue-rotate(200deg) brightness(1.5)',
    },
];

// ─── Archer Paragon Abilities ───────────────────────────────────────────────

export const ARCHER_PARAGON_ABILITIES: ParagonAbilityDef[] = [
    {
        id: 'rain_of_arrows',
        name: 'Pilregn',
        description: 'Regner piler ned over et målområde i 3 sekunder.',
        icon: 'item_bow',
        hotkey: 'E',
        paragonRequired: 2,
        cooldown: 15000,
        duration: 3000,
        type: 'new',
        classId: 'archer',
        iconTint: 'hue-rotate(30deg)',
    },
    {
        id: 'shadow_step',
        name: 'Skyggesteg',
        description: 'Teleporter bak nærmeste fiende og garanterer kritisk treff.',
        icon: 'item_lightning',
        hotkey: 'F',
        paragonRequired: 4,
        cooldown: 18000,
        duration: 0,
        type: 'new',
        classId: 'archer',
        iconTint: 'hue-rotate(240deg) brightness(0.7)',
    },
    {
        id: 'phoenix_arrow',
        name: 'Føniks-Pil',
        description: 'Massiv ildpil som eksploderer og etterlater brennende bakke.',
        icon: 'item_bow',
        hotkey: 'Q',
        paragonRequired: 6,
        cooldown: 40000,
        duration: 0,
        type: 'mutation',
        mutatesFrom: 'bow',
        classId: 'archer',
        iconTint: 'hue-rotate(10deg) saturate(2) brightness(1.3)',
    },
];

// ─── Wizard Paragon Abilities ───────────────────────────────────────────────

export const WIZARD_PARAGON_ABILITIES: ParagonAbilityDef[] = [
    {
        id: 'meteor_shower',
        name: 'Meteorregn',
        description: 'Kanaliserer meteorer som regner ned i et område i 3 sekunder.',
        icon: 'item_magic_staff',
        hotkey: 'E',
        paragonRequired: 2,
        cooldown: 20000,
        duration: 3000,
        type: 'new',
        classId: 'wizard',
        iconTint: 'hue-rotate(15deg) saturate(2)',
    },
    {
        id: 'time_warp',
        name: 'Tidsvarp',
        description: 'Bremser alle fiender i radius med 80% i 4 sekunder.',
        icon: 'item_frost_orb',
        hotkey: 'F',
        paragonRequired: 4,
        cooldown: 30000,
        duration: 4000,
        type: 'new',
        classId: 'wizard',
        iconTint: 'hue-rotate(180deg) brightness(1.3)',
    },
    {
        id: 'arcane_nova',
        name: 'Arkan Nova',
        description: 'Massiv eksplosjon sentrert på spilleren. Skalerer med alle element-oppgraderinger.',
        icon: 'item_synergy_rune',
        hotkey: 'Q',
        paragonRequired: 6,
        cooldown: 50000,
        duration: 0,
        type: 'new',
        classId: 'wizard',
        iconTint: 'hue-rotate(270deg) saturate(1.5) brightness(1.2)',
    },
];

// ─── Skald Paragon Abilities ────────────────────────────────────────────────

export const SKALD_PARAGON_ABILITIES: ParagonAbilityDef[] = [
    {
        id: 'war_hymn',
        name: 'Krigshymne',
        description: 'AoE buff: alle allierte får +25% skade i 8 sekunder.',
        icon: 'item_lute',
        hotkey: 'E',
        paragonRequired: 2,
        cooldown: 20000,
        duration: 8000,
        type: 'new',
        classId: 'skald',
        iconTint: 'hue-rotate(45deg) saturate(1.5)',
    },
    {
        id: 'dissonance',
        name: 'Dissonans',
        description: 'AoE debuff: fiender tar +40% skade i 5 sekunder.',
        icon: 'item_harp',
        hotkey: 'F',
        paragonRequired: 4,
        cooldown: 25000,
        duration: 5000,
        type: 'new',
        classId: 'skald',
        iconTint: 'hue-rotate(270deg)',
    },
    {
        id: 'ragnarok_vers',
        name: 'Ragnarök-Vers',
        description: 'Ultimate: alle 4 Vers aktiveres samtidig i 10 sekunder.',
        icon: 'item_lute',
        hotkey: 'Q',
        paragonRequired: 6,
        cooldown: 60000,
        duration: 10000,
        type: 'mutation',
        mutatesFrom: 'seierskvad',
        classId: 'skald',
        iconTint: 'hue-rotate(0deg) saturate(2) brightness(1.5)',
    },
];

// ─── Lookup Map ─────────────────────────────────────────────────────────────

const ALL_PARAGON_ABILITIES: ParagonAbilityDef[] = [
    ...KRIEGER_PARAGON_ABILITIES,
    ...ARCHER_PARAGON_ABILITIES,
    ...WIZARD_PARAGON_ABILITIES,
    ...SKALD_PARAGON_ABILITIES,
];

export function getParagonAbilitiesForClass(classId: ClassId): ParagonAbilityDef[] {
    return ALL_PARAGON_ABILITIES.filter(a => a.classId === classId);
}

export function getUnlockedParagonAbilities(classId: ClassId, paragonLevel: number): ParagonAbilityDef[] {
    return getParagonAbilitiesForClass(classId).filter(a => paragonLevel >= a.paragonRequired);
}

export function getParagonAbilityById(id: string): ParagonAbilityDef | undefined {
    return ALL_PARAGON_ABILITIES.find(a => a.id === id);
}

/** The three Paragon ability hotkeys */
export const PARAGON_HOTKEYS: ParagonAbilitySlot[] = ['E', 'F', 'Q'];
