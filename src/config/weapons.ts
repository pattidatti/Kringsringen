export type WeaponId = 'sword' | 'bow' | 'magic_bolt' | 'frost' | string;

export interface WeaponUIConfig {
    id: WeaponId;
    label: string;
    hotkey: string;
    icon?: string;
}

export const KRIEGER_WEAPON_SLOTS: WeaponUIConfig[] = [
    { id: 'sword', label: 'SVERD', hotkey: '1', icon: 'item_sword' },
    { id: 'ability_whirlwind', label: 'WHIRLWIND', hotkey: '2', icon: 'item_swords_crossed' },
];

export const ARCHER_WEAPON_SLOTS: WeaponUIConfig[] = [
    { id: 'bow', label: 'BUE', hotkey: '1', icon: 'item_bow' },
    { id: 'ability_explosive', label: 'E-SHOT', hotkey: '2', icon: 'item_bow' },
];

/** Wizard-specific hotbar: Fire=1, Frost=2, Lightning=3, Cascade ability=4 */
export const WIZARD_WEAPON_SLOTS: WeaponUIConfig[] = [
    { id: 'fireball', label: 'ILD', hotkey: '1', icon: 'item_magic_staff' },
    { id: 'frost', label: 'FROST', hotkey: '2', icon: 'item_frost_orb' },
    { id: 'lightning', label: 'LYN', hotkey: '3', icon: 'item_lightning_staff' },
    { id: 'ability_cascade', label: 'KASKADE', hotkey: '4', icon: 'item_magic_staff' },
];
