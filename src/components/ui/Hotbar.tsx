import React, { useEffect, useState } from 'react';
import { useGameRegistry, getGameInstance } from '../../hooks/useGameRegistry';

export const Hotbar: React.FC = React.memo(() => {
    const currentWeapon = useGameRegistry('currentWeapon', 'sword');
    const [activeSlot, setActiveSlot] = useState<string | null>(null);

    const handleSelectWeapon = (weaponId: string) => {
        const game = getGameInstance();
        if (game) {
            game.registry.set('currentWeapon', weaponId);
            setActiveSlot(weaponId);
            setTimeout(() => setActiveSlot(null), 200); // Reset animation
        }
    };

    // Listen for keyboard input (1-5)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['1', '2', '3', '4', '5'].includes(e.key)) {
                // Map key to slot ID (this logic is simplified, assumes slot order matches keys)
                const index = parseInt(e.key) - 1;
                const slots = ['sword', 'bow', 'empty3', 'empty4', 'empty5'];
                if (slots[index]) {
                    handleSelectWeapon(slots[index]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const slots = [
        { id: 'sword', icon: 'm-icon-sword-large', label: '1' },
        { id: 'bow', icon: 'm-icon-bow', label: '2' },
        { id: 'empty3', icon: '', label: '3' },
        { id: 'empty4', icon: '', label: '4' },
        { id: 'empty5', icon: '', label: '5' },
    ];

    return (
        <div className="relative flex items-end gap-2 p-4 pb-2 bg-gradient-to-t from-black/80 to-transparent rounded-t-xl backdrop-blur-sm border-t border-white/5">
            {/* Decorative base line */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

            {slots.map((slot) => {
                const isActive = currentWeapon === slot.id;
                const isPressed = activeSlot === slot.id;

                return (
                    <div
                        key={slot.id}
                        className={`
                            relative w-16 h-16 flex items-center justify-center 
                            transition-all duration-200 ease-out cursor-pointer
                            ${isActive ? '-translate-y-2 scale-110 drop-shadow-[0_0_10px_rgba(255,204,0,0.5)]' : 'hover:-translate-y-1 hover:brightness-110'}
                            ${isPressed ? 'scale-95 brightness-125' : ''}
                        `}
                        onClick={() => slot.icon && handleSelectWeapon(slot.id)}
                        role="button"
                        aria-keyshortcuts={slot.label}
                        aria-label={`Select ${slot.id}`}
                    >
                        {/* Slot Background (Socket) */}
                        <div
                            className="absolute inset-0 bg-no-repeat bg-center bg-contain opacity-90"
                            style={{
                                backgroundImage: `url('/assets/ui/fantasy/UI_Buttons.png')`,
                                backgroundPosition: '-192px -8px', // Using m-hotbar-slot coordinates
                                backgroundSize: '512px 512px' // Adjust based on sprite sheet size assumption or CSS class
                            }}
                        />

                        {/* Active Glow Overlay */}
                        {isActive && (
                            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-md animate-pulse" />
                        )}

                        {/* Icon */}
                        {slot.icon && (
                            <div className={`relative z-10 ${slot.icon} transform transition-transform ${isActive ? 'scale-110' : ''}`} />
                        )}

                        {/* Hotkey Label */}
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-black/80 border border-amber-900/50 rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-bold text-amber-100 font-mono leading-none">{slot.label}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
