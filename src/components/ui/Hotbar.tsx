import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useGameRegistry, getGameInstance } from '../../hooks/useGameRegistry';
import { KRIEGER_WEAPON_SLOTS, ARCHER_WEAPON_SLOTS, WIZARD_WEAPON_SLOTS, SKALD_WEAPON_SLOTS, type WeaponId } from '../../config/weapons';
import { resolveClassId } from '../../config/classes';
import type { ClassId } from '../../config/classes';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { FantasyPanel } from './FantasyPanel';
import uiSelectors from '../../assets/ui/fantasy/UI_Selectors.png';
import { ItemIcon, type ItemIconKey } from './ItemIcon';
import { isItemSpriteIcon } from '../../config/upgrades';
import { AbilityTooltip } from './AbilityTooltip';
import { getAbilityTooltipData } from '../../utils/tooltipDataBuilder';
import { getUnlockedParagonAbilities } from '../../config/paragon-abilities';

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
        <svg viewBox="0 0 50 50" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-30 opacity-60">
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
    const playerClass = useGameRegistry('playerClass', 'krieger') as string;
    const classAbilityCooldown = useGameRegistry('classAbilityCooldown', null) as { duration: number, timestamp: number } | null;
    const classAbility3Cooldown = useGameRegistry('classAbility3Cooldown', null) as { duration: number, timestamp: number } | null;
    const classAbility4Cooldown = useGameRegistry('classAbility4Cooldown', null) as { duration: number, timestamp: number } | null;
    const upgradeLevels = useGameRegistry('upgradeLevels', {}) as Record<string, number>;
    const skaldVers = useGameRegistry('skaldVers', 0) as number;
    const paragonLevel = useGameRegistry('paragonLevel', 0) as number;

    // Paragon ability cooldowns (E, F, Q)
    const paragonECooldown = useGameRegistry('paragonAbilityCooldown_E', null) as { duration: number, timestamp: number } | null;
    const paragonFCooldown = useGameRegistry('paragonAbilityCooldown_F', null) as { duration: number, timestamp: number } | null;
    const paragonQCooldown = useGameRegistry('paragonAbilityCooldown_Q', null) as { duration: number, timestamp: number } | null;

    // Tooltip state
    const [hoveredSlot, setHoveredSlot] = useState<{ id: WeaponId; element: HTMLElement } | null>(null);
    const hoverTimeoutRef = useRef<number | null>(null);

    const classId = resolveClassId(playerClass);
    const activeSlots = classId === 'wizard' ? WIZARD_WEAPON_SLOTS
        : classId === 'archer' ? ARCHER_WEAPON_SLOTS
        : classId === 'skald' ? SKALD_WEAPON_SLOTS
        : KRIEGER_WEAPON_SLOTS;

    const handleSelectWeapon = useCallback((weaponId: WeaponId) => {
        const game = getGameInstance();
        if (game) {
            game.registry.set('currentWeapon', weaponId);
        }
    }, []);

    // Tooltip hover handlers (debounced to prevent spam)
    const handleMouseEnter = useCallback((slotId: WeaponId, element: HTMLElement) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = window.setTimeout(() => {
            setHoveredSlot({ id: slotId, element });
        }, 100); // 100ms debounce
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setHoveredSlot(null);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    // Keyboard Listeners (class-aware)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const slot = activeSlots.find(s => s.hotkey === e.key);
            if (!slot) return;

            // Skip ability slots — handled by Phaser
            if (slot.id.startsWith('ability_')) return;

            if (unlockedWeapons.includes(slot.id)) {
                handleSelectWeapon(slot.id);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSlots, unlockedWeapons, handleSelectWeapon]);

    // Compute tooltip data for the hovered slot
    const tooltipData = hoveredSlot
        ? getAbilityTooltipData(hoveredSlot.id, upgradeLevels, skaldVers)
        : null;

    return (
        <div className="flex items-end justify-center pb-2">
            <FantasyPanel
                variant="wood"
                scale={1}
                contentPadding="px-2 py-2"
                style={{ filter: 'drop-shadow(0 -4px 8px rgba(0,0,0,0.6))' }}
            >
                <div className="flex gap-1" role="tablist" aria-label="Weapon Selection">
                    {activeSlots.map((slot) => {
                        const isAbilitySlot = slot.id.startsWith('ability_');
                        const unlocked = unlockedWeapons || [];
                        const isUnlocked = unlocked.includes(slot.id);
                        const isActive = isAbilitySlot ? false : currentWeapon === slot.id;

                        // Check if ability is ready (not on cooldown)
                        let isAbilityReady = false;
                        if (isAbilitySlot) {
                            const now = Date.now();
                            if (slot.hotkey === '2') {
                                isAbilityReady = !classAbilityCooldown || (classAbilityCooldown.timestamp + classAbilityCooldown.duration) <= now;
                            } else if (slot.hotkey === '3') {
                                isAbilityReady = !classAbility3Cooldown || (classAbility3Cooldown.timestamp + classAbility3Cooldown.duration) <= now;
                            } else if (slot.hotkey === '4') {
                                isAbilityReady = !classAbility4Cooldown || (classAbility4Cooldown.timestamp + classAbility4Cooldown.duration) <= now;
                            }
                        }

                        return (
                            <div
                                key={slot.hotkey}
                                role="tab"
                                aria-selected={isActive}
                                aria-keyshortcuts={slot.hotkey}
                                onClick={() => isUnlocked && handleSelectWeapon(slot.id)}
                                onMouseEnter={(e) => isUnlocked && handleMouseEnter(slot.id, e.currentTarget)}
                                onMouseLeave={handleMouseLeave}
                                onFocus={(e) => isUnlocked && handleMouseEnter(slot.id, e.currentTarget)}
                                onBlur={handleMouseLeave}
                                tabIndex={isUnlocked ? 0 : -1}
                                className={clsx(
                                    "relative w-20 h-20 flex items-center justify-center transition-all duration-200",
                                    isUnlocked
                                        ? "cursor-pointer hover:-translate-y-1 hover:brightness-125"
                                        : "opacity-40 cursor-default grayscale",
                                    isActive && "z-20"
                                )}
                            >
                                {/* Slot dark recess */}
                                <div className="absolute inset-x-0 inset-y-0.5 bg-black/50 rounded-md" />

                                {/* Lock icon for locked slots */}
                                {!isUnlocked && (
                                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none" title="Lås opp i boken">
                                        <svg className="w-6 h-6 text-amber-300/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}

                                {/* Ready glow for abilities */}
                                {isAbilitySlot && isUnlocked && isAbilityReady && (
                                    <motion.div
                                        className="absolute inset-0 rounded-md border-2 border-purple-400/60 pointer-events-none z-10"
                                        animate={{
                                            boxShadow: [
                                                '0 0 8px rgba(168,85,247,0.4)',
                                                '0 0 16px rgba(168,85,247,0.6)',
                                                '0 0 8px rgba(168,85,247,0.4)',
                                            ]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                )}

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
                                        fitSize={65}
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

                                {/* Cooldown Sweep Overlay — weapon slots use weaponCooldown, ability slot uses classAbilityCooldown */}
                                {isUnlocked && !isAbilitySlot && weaponCooldown && (
                                    <RadialCooldown duration={weaponCooldown.duration} timestamp={weaponCooldown.timestamp} />
                                )}
                                {/* Class ability slot 2 cooldown */}
                                {isAbilitySlot && slot.hotkey === '2' && classAbilityCooldown && (
                                    <RadialCooldown duration={classAbilityCooldown.duration} timestamp={classAbilityCooldown.timestamp} />
                                )}
                                {isAbilitySlot && slot.hotkey === '3' && classAbility3Cooldown && (
                                    <RadialCooldown duration={classAbility3Cooldown.duration} timestamp={classAbility3Cooldown.timestamp} />
                                )}
                                {isAbilitySlot && slot.hotkey === '4' && classAbility4Cooldown && (
                                    <RadialCooldown duration={classAbility4Cooldown.duration} timestamp={classAbility4Cooldown.timestamp} />
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

            {/* Paragon Ability Slots (E, F, Q) — shown above main hotbar when unlocked */}
            {paragonLevel > 0 && (() => {
                const classId = resolveClassId(playerClass) as ClassId;
                const abilities = getUnlockedParagonAbilities(classId, paragonLevel);
                if (abilities.length === 0) return null;

                const cdMap: Record<string, { duration: number, timestamp: number } | null> = {
                    'E': paragonECooldown,
                    'F': paragonFCooldown,
                    'Q': paragonQCooldown,
                };

                return (
                    <div className="flex justify-center mb-1">
                        <FantasyPanel
                            variant="obsidian"
                            scale={1}
                            contentPadding="px-1.5 py-1.5"
                            style={{ filter: 'drop-shadow(0 -2px 6px rgba(180,130,0,0.3))' }}
                        >
                            <div className="flex gap-1">
                                {abilities.map((ability) => {
                                    const cd = cdMap[ability.hotkey];

                                    return (
                                        <div
                                            key={ability.id}
                                            className="relative w-16 h-16 flex items-center justify-center cursor-default group"
                                            title={`${ability.name}: ${ability.description}`}
                                        >
                                            {/* Slot background */}
                                            <div className="absolute inset-x-0 inset-y-0.5 bg-black/50 rounded-md" />

                                            {/* Icon */}
                                            {isItemSpriteIcon(ability.icon) ? (
                                                <ItemIcon
                                                    icon={ability.icon as ItemIconKey}
                                                    fitSize={50}
                                                    className="relative z-20"
                                                    style={ability.iconTint ? { filter: ability.iconTint } : undefined}
                                                />
                                            ) : (
                                                <span className="relative z-20 font-cinzel text-amber-200 text-xs">
                                                    {ability.name.slice(0, 3)}
                                                </span>
                                            )}

                                            {/* Cooldown overlay */}
                                            {cd && (
                                                <RadialCooldown duration={cd.duration} timestamp={cd.timestamp} />
                                            )}

                                            {/* Gold border glow */}
                                            <div className="absolute inset-0 rounded-md border border-amber-500/30 pointer-events-none" />

                                            {/* Hotkey badge */}
                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-900/90 border border-amber-400/60 rounded flex items-center justify-center z-40">
                                                <span className="text-[10px] text-amber-200 font-mono font-bold leading-none">{ability.hotkey}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </FantasyPanel>
                    </div>
                );
            })()}

            {/* Tooltip */}
            {tooltipData && hoveredSlot && (
                <AbilityTooltip
                    data={tooltipData}
                    anchorEl={hoveredSlot.element}
                    isVisible={true}
                />
            )}
        </div>
    );
});
