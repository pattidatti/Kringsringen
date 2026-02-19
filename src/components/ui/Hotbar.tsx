import React from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { getGameInstance } from '../../hooks/useGameRegistry';

export const Hotbar: React.FC = () => {
    const currentWeapon = useGameRegistry('currentWeapon', 'sword');

    const handleSelectWeapon = (weaponId: string) => {
        const game = getGameInstance();
        if (game) {
            game.registry.set('currentWeapon', weaponId);
        }
    };

    const slots = [
        { id: 'sword', icon: 'm-icon-sword-large', label: '1' },
        { id: 'bow', icon: 'm-icon-bow', label: '2' },
        { id: 'empty3', icon: '', label: '3' },
        { id: 'empty4', icon: '', label: '4' },
        { id: 'empty5', icon: '', label: '5' },
    ];

    return (
        <div className="flex gap-4 p-4">
            {slots.map((slot) => (
                <div
                    key={slot.id}
                    className={`m-hotbar-slot ${currentWeapon === slot.id ? 'active' : ''} cursor-pointer hover:brightness-110 active:scale-95 transition-all`}
                    onClick={() => slot.icon && handleSelectWeapon(slot.id)}
                >
                    {slot.icon && (
                        <div className={`${slot.icon} m-scale-1 group-hover:scale-110 transition-transform`} />
                    )}
                    <span className="m-hotkey-label">{slot.label}</span>
                </div>
            ))}
        </div>
    );
};
