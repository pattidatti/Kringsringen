import React, { useCallback, useEffect } from 'react';
import { useGameRegistry, getGameInstance } from '../../hooks/useGameRegistry';
import { WEAPON_SLOTS, type WeaponId } from '../../config/weapons';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import panelWood from '../../assets/ui/fantasy/panels/panel_wood.png';
import uiSelectors from '../../assets/ui/fantasy/UI_Selectors.png';

export const Hotbar: React.FC = React.memo(() => {
    const currentWeapon = useGameRegistry('currentWeapon', 'sword');
    const unlockedWeapons = useGameRegistry('unlockedWeapons', ['sword']) as WeaponId[];

    const handleSelectWeapon = useCallback((weaponId: WeaponId) => {
        const game = getGameInstance();
        if (game) {
            game.registry.set('currentWeapon', weaponId);
        }
    }, []);

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const slot = WEAPON_SLOTS.find(s => s.hotkey === e.key);
            if (slot && unlockedWeapons.includes(slot.id)) {
                handleSelectWeapon(slot.id);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [unlockedWeapons, handleSelectWeapon]);

    return (
        <div className="relative flex items-end justify-center p-6 pb-2">
            {/* Wood Panel Background */}
            <div
                className="absolute inset-x-0 bottom-0 h-24 z-0 max-w-lg mx-auto"
                style={{
                    backgroundImage: `url(${panelWood})`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'pixelated',
                    filter: 'drop-shadow(0 -4px 6px rgba(0,0,0,0.5))'
                }}
            />

            <div className="relative z-10 flex gap-2 mb-3" role="tablist" aria-label="Weapon Selection">
                {WEAPON_SLOTS.map((slot) => {
                    // Check if this slot is a real weapon and if it's unlocked
                    const isRealWeapon = !slot.id.startsWith('wrapper_');
                    const isUnlocked = isRealWeapon && unlockedWeapons.includes(slot.id);
                    const isActive = currentWeapon === slot.id;

                    return (
                        <div
                            key={slot.hotkey} // Use hotkey as key since IDs might be wrapper_X
                            role="tab"
                            aria-selected={isActive}
                            aria-keyshortcuts={slot.hotkey}
                            onClick={() => isUnlocked && handleSelectWeapon(slot.id)}
                            className={clsx(
                                "relative w-16 h-16 flex items-center justify-center transition-all duration-200",
                                isUnlocked
                                    ? "cursor-pointer hover:-translate-y-1 brightness-110"
                                    : "opacity-50 cursor-default grayscale",
                                // Active state scaling is handled by the selector logic or minimal scale
                                isActive && "z-20"
                            )}
                        >
                            {/* Slot Background / Socket Shadow */}
                            <div className="absolute inset-2 bg-black/40 rounded-lg blur-sm" />

                            {/* Selector Animation - Only for active */}
                            {isActive && (
                                <motion.div
                                    layoutId="active-selector"
                                    className="absolute inset-[-12px] pointer-events-none flex items-center justify-center z-30"
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <div
                                        className="w-full h-full bg-no-repeat image-pixelated"
                                        style={{
                                            backgroundImage: `url(${uiSelectors})`,
                                            backgroundPosition: '-96px 0px',
                                            backgroundSize: '384px 384px',
                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                                        }}
                                    />
                                </motion.div>
                            )}

                            {/* Text Label */}
                            {slot.label && (
                                <span className={clsx(
                                    "relative z-20 font-fantasy tracking-widest text-xs transition-colors duration-200 mt-1",
                                    isActive
                                        ? "text-amber-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                                        : "text-stone-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                                )}>
                                    {slot.label}
                                </span>
                            )}

                            {/* Hotkey Indicator */}
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-black/60 border border-amber-900/30 rounded flex items-center justify-center z-20">
                                <span className="text-[9px] text-amber-200/80 font-mono leading-none">{slot.hotkey}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
