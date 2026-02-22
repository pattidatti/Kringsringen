import React, { useCallback, useEffect } from 'react';
import { useGameRegistry, getGameInstance } from '../../hooks/useGameRegistry';
import { WEAPON_SLOTS, type WeaponId } from '../../config/weapons';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { FantasyPanel } from './FantasyPanel';
import uiSelectors from '../../assets/ui/fantasy/UI_Selectors.png';

/**
 * Selector sprite constants.
 * UI_Selectors.png is 192×960 (4 cols × 20 rows of 48×48 sprites).
 * We pick the green full-frame selector at row 5, col 0.
 */
const SELECTOR_SCALE = 3;
const SELECTOR_CELL = 48;
const SELECTOR_COL = 0;
const SELECTOR_ROW = 5;
const SELECTOR_BG_SIZE = `${192 * SELECTOR_SCALE}px ${960 * SELECTOR_SCALE}px`;
const SELECTOR_BG_POS = `-${SELECTOR_COL * SELECTOR_CELL * SELECTOR_SCALE}px -${SELECTOR_ROW * SELECTOR_CELL * SELECTOR_SCALE}px`;
const SELECTOR_DISPLAY_SIZE = SELECTOR_CELL * SELECTOR_SCALE; // 144px

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
        <div className="flex items-end justify-center pb-2">
            <FantasyPanel
                variant="wood"
                scale={2}
                contentPadding="px-3 py-2"
                style={{ filter: 'drop-shadow(0 -4px 8px rgba(0,0,0,0.6))' }}
            >
                <div className="flex gap-2" role="tablist" aria-label="Weapon Selection">
                    {WEAPON_SLOTS.map((slot) => {
                        const isRealWeapon = !slot.id.startsWith('wrapper_');
                        const isUnlocked = isRealWeapon && unlockedWeapons.includes(slot.id);
                        const isActive = currentWeapon === slot.id;

                        return (
                            <div
                                key={slot.hotkey}
                                role="tab"
                                aria-selected={isActive}
                                aria-keyshortcuts={slot.hotkey}
                                onClick={() => isUnlocked && handleSelectWeapon(slot.id)}
                                className={clsx(
                                    "relative w-14 h-14 flex items-center justify-center transition-all duration-200",
                                    isUnlocked
                                        ? "cursor-pointer hover:-translate-y-1 hover:brightness-125"
                                        : "opacity-40 cursor-default grayscale",
                                    isActive && "z-20"
                                )}
                            >
                                {/* Slot dark recess */}
                                <div className="absolute inset-1 bg-black/50 rounded-md" />

                                {/* Selector — active weapon only */}
                                {isActive && (
                                    <motion.div
                                        layoutId="active-selector"
                                        className="absolute pointer-events-none z-30"
                                        style={{
                                            width: SELECTOR_DISPLAY_SIZE,
                                            height: SELECTOR_DISPLAY_SIZE,
                                            /* Center the 144px selector over the 56px slot */
                                            left: '50%',
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)',
                                        }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    >
                                        <div
                                            className="w-full h-full bg-no-repeat"
                                            style={{
                                                backgroundImage: `url(${uiSelectors})`,
                                                backgroundPosition: SELECTOR_BG_POS,
                                                backgroundSize: SELECTOR_BG_SIZE,
                                                imageRendering: 'pixelated',
                                                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))'
                                            }}
                                        />
                                    </motion.div>
                                )}

                                {/* Weapon label */}
                                {slot.label && (
                                    <span className={clsx(
                                        "relative z-20 font-fantasy tracking-widest text-xs transition-colors duration-200",
                                        isActive
                                            ? "text-amber-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                                            : "text-stone-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                                    )}>
                                        {slot.label}
                                    </span>
                                )}

                                {/* Hotkey badge */}
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-black/60 border border-amber-900/30 rounded flex items-center justify-center z-20">
                                    <span className="text-[9px] text-amber-200/80 font-mono leading-none">{slot.hotkey}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </FantasyPanel>
        </div>
    );
});
