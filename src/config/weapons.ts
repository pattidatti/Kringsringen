export type WeaponId = 'sword' | 'bow' | 'magic_bolt' | 'frost' | string;

export interface WeaponUIConfig {
    id: WeaponId;
    label: string;
    hotkey: string;
    icon?: string;
}

export const WEAPON_SLOTS: WeaponUIConfig[] = [
    { id: 'sword',     label: 'SVERD', hotkey: '1', icon: 'item_sword' },
    { id: 'bow',       label: 'BUE',   hotkey: '2', icon: 'item_bow' },
    { id: 'fireball',  label: 'ILD',   hotkey: '3', icon: 'item_magic_staff' },
    { id: 'frost',     label: 'FROST', hotkey: '4', icon: 'item_frost_orb' },
    { id: 'lightning', label: 'LYN',   hotkey: '5', icon: 'item_lightning_staff' },
];
