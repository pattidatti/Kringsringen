import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useGameRegistry, getGameInstance } from '../../hooks/useGameRegistry';
import { WEAPON_SLOTS, type WeaponId } from '../../config/weapons';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { FantasyPanel } from './FantasyPanel';
import uiSelectors from '../../assets/ui/fantasy/UI_Selectors.png';
import { ItemIcon, type ItemIconKey } from './ItemIcon';
import { isItemSpriteIcon } from '../../config/upgrades';

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
const COOLDOWN_CIRCUMFERENCE = 2 * Math.PI * 25;
const COOLDOWN_STYLE = {
    fill: "transparent",
    stroke: "black",
    strokeWidth: 50,
    strokeDasharray: COOLDOWN_CIRCUMFERENCE
};

const RadialCooldown = React.memo(({ duration, timestamp }: { duration: number, timestamp: number }) => {
    const circleRef = useRef<SVGCircleElement>(null);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        setIsComplete(false);
        const start = timestamp;
        const end = timestamp + duration;
        let rafId: number;

        const update = () => {
            const now = Date.now();
            if (now >= end) {
                setIsComplete(true);
            } else {
                if (circleRef.current) {
                    const progress = (now - start) / duration;
                    const offset = -COOLDOWN_CIRCUMFERENCE * Math.max(0, Math.min(1, progress));
                    circleRef.current.style.strokeDashoffset = offset.toString();
                }
                rafId = requestAnimationFrame(update);
            }
        };

        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [duration, timestamp]);

    if (isComplete) return null;

    return (
        <svg viewBox="0 0 50 50" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-30 opacity-40 mix-blend-multiply">
            <circle
                ref={circleRef}
                cx="25"
                cy="25"
                r="25"
                style={COOLDOWN_STYLE}
            />
        </svg>
    );
});

export const Hotbar: React.FC = React.memo(() => {
    const currentWeapon = useGameRegistry('currentWeapon', 'sword');
    const unlockedWeapons = useGameRegistry('unlockedWeapons', ['sword']) as WeaponId[];
    const weaponCooldown = useGameRegistry('weaponCooldown', null) as { duration: number, timestamp: number } | null;

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
                                    "relative w-20 h-20 flex items-center justify-center transition-all duration-200",
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
                                        initial={{ scale: 0.85 }}
                                        animate={{ scale: 1 }}
                                        className="absolute pointer-events-none z-30"
                                        style={{
                                            width: SELECTOR_DISPLAY_SIZE,
                                            height: SELECTOR_DISPLAY_SIZE,
                                            /* Center the 144px selector over the 80px slot without transform */
                                            top: -((SELECTOR_DISPLAY_SIZE - 80) / 2),
                                            left: -((SELECTOR_DISPLAY_SIZE - 80) / 2),
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

                                {/* Weapon icon or label */}
                                {slot.icon && isItemSpriteIcon(slot.icon) ? (
                                    <ItemIcon
                                        icon={slot.icon as ItemIconKey}
                                        size="md"
                                        className={clsx(
                                            "relative z-20 transition-all duration-200",
                                            isActive ? "brightness-125" : "brightness-75"
                                        )}
                                    />
                                ) : slot.label ? (
                                    <span className={clsx(
                                        "relative z-20 font-cinzel tracking-widest text-xs transition-colors duration-200",
                                        isActive
                                            ? "text-amber-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                                            : "text-stone-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                                    )}>
                                        {slot.label}
                                    </span>
                                ) : null}

                                {/* Cooldown Sweep Overlay */}
                                {isUnlocked && weaponCooldown && (
                                    <RadialCooldown duration={weaponCooldown.duration} timestamp={weaponCooldown.timestamp} />
                                )}

                                {/* Hotkey badge */}
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-black/70 border border-amber-500/50 rounded flex items-center justify-center z-40">
                                    <span className="text-sm text-amber-200 font-mono font-bold leading-none">{slot.hotkey}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </FantasyPanel>
        </div>
    );
});
