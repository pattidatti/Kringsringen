export type WeaponId = 'sword' | 'bow' | 'magic_bolt' | string;

export interface WeaponUIConfig {
    id: WeaponId;
    label: string;
    hotkey: string;
    icon?: string;
}

export const WEAPON_SLOTS: WeaponUIConfig[] = [
    { id: 'sword', label: 'SVERD', hotkey: '1' },
    { id: 'bow', label: 'BUE', hotkey: '2' },
    { id: 'wrapper_1', label: '', hotkey: '3' },
    { id: 'wrapper_2', label: '', hotkey: '4' },
    { id: 'wrapper_3', label: '', hotkey: '5' },
];
