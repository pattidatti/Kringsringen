import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import bookOpen from '../../assets/ui/fantasy/containers/book_open.png';
import tabRed from '../../assets/ui/fantasy/tabs/red.png';
import tabGreen from '../../assets/ui/fantasy/tabs/green.png';
import tabYellow from '../../assets/ui/fantasy/tabs/yellow.png';
import tabBlue from '../../assets/ui/fantasy/tabs/blue.png';
import { UPGRADES, type UpgradeConfig, isItemSpriteIcon, CHAPTER_DEFINITIONS, type ChapterId } from '../../config/upgrades';
import { CLASS_UPGRADES } from '../../config/class-upgrades';
import { CLASS_CONFIGS, resolveClassId } from '../../config/classes';
import { PARAGON_UPGRADES, type ParagonUpgradeConfig } from '../../config/paragon-upgrades';
import { getParagonTierName } from '../../config/paragon';
import { ItemIcon, type ItemIconKey } from './ItemIcon';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { SettingsContent } from './SettingsContent';
import { AchievementBookOverlay } from './AchievementBookOverlay';
import { useSprite } from '../../hooks/useSprite';
import type { SpriteKey } from '../../config/ui-atlas';
// import { type FantasyTabVariant } from '../../types/fantasy-ui.generated';

export type BookMode = 'view' | 'level_up' | 'shop';

interface FantasyBookProps {
    isOpen: boolean;
    mode: BookMode;
    onClose: () => void;

    // Session Logic (still passed from GameContainer)
    isGamePaused?: boolean;
    availablePerks?: UpgradeConfig[]; // For Level Up shuffling

    // Actions
    actions: {
        onSelectPerk: (id: string) => void;
        onBuyUpgrade: (id: string, cost: number) => void;
        onBuyRevive?: (targetId: string, cost: number) => void;
        onCheatGold?: () => void;
    }

    // Multiplayer State
    isMultiplayer?: boolean;
    isWaitingReady?: boolean;
    readyPlayersCount?: number;
    expectedPlayersCount?: number;
    readyReason?: 'unpause' | 'next_level' | 'retry' | null;

    // Exit to main menu
    onExitGame?: () => void;
}

type TabKey = 'character' | 'upgrades' | 'achievements' | 'settings';

const TABS: Record<TabKey, { title: string; icon: string; spriteIcon: SpriteKey; color: string; locked?: boolean }> = {
    character: { title: 'Character', icon: tabRed, spriteIcon: 'icon_shield_large', color: 'text-red-900' },
    upgrades: { title: 'Upgrades', icon: tabGreen, spriteIcon: 'icon_backpack', color: 'text-emerald-900' },
    achievements: { title: 'Achievements', icon: tabBlue, spriteIcon: 'icon_coin', color: 'text-blue-900' },
    settings: { title: 'Settings', icon: tabYellow, spriteIcon: 'icon_gear', color: 'text-amber-900' },
};

const CATEGORY_THEMES: Record<string, { primary: string; secondary: string; border: string; bg: string; text: string }> = {
    // Delte (legacy + alias)
    'Karakter': { primary: '#b45309', secondary: '#f59e0b', border: 'border-amber-900/40', bg: 'bg-amber-100/40', text: 'text-amber-950' },
    'karakter': { primary: '#b45309', secondary: '#f59e0b', border: 'border-amber-900/40', bg: 'bg-amber-100/40', text: 'text-amber-950' },
    'Sverd': { primary: '#991b1b', secondary: '#ef4444', border: 'border-red-900/40', bg: 'bg-red-100/40', text: 'text-red-950' },
    'Bue': { primary: '#065f46', secondary: '#10b981', border: 'border-emerald-900/40', bg: 'bg-emerald-100/40', text: 'text-emerald-950' },
    'Magi': { primary: '#3730a3', secondary: '#6366f1', border: 'border-indigo-900/40', bg: 'bg-indigo-100/40', text: 'text-indigo-950' },
    'Synergi': { primary: '#9a3412', secondary: '#ea580c', border: 'border-orange-900/40', bg: 'bg-orange-100/40', text: 'text-orange-950' },
    // Krieger (rød)
    'krieger_sverd': { primary: '#7f1d1d', secondary: '#c0392b', border: 'border-red-900/30', bg: 'bg-red-200/30', text: 'text-red-950' },
    'krieger_rustning': { primary: '#7f1d1d', secondary: '#c0392b', border: 'border-red-900/30', bg: 'bg-red-200/30', text: 'text-red-950' },
    // Legacy krieger ids (kept for safety)
    'krieger_drivkraft': { primary: '#7f1d1d', secondary: '#c0392b', border: 'border-red-900/30', bg: 'bg-red-200/30', text: 'text-red-950' },
    'krieger_mastring': { primary: '#7f1d1d', secondary: '#c0392b', border: 'border-red-900/30', bg: 'bg-red-200/30', text: 'text-red-950' },
    'krieger_kamptalent': { primary: '#7f1d1d', secondary: '#c0392b', border: 'border-red-900/30', bg: 'bg-red-200/30', text: 'text-red-950' },
    // Archer (grønn)
    'archer_bue': { primary: '#14532d', secondary: '#27ae60', border: 'border-emerald-900/30', bg: 'bg-emerald-200/30', text: 'text-emerald-950' },
    'archer_smidighet': { primary: '#14532d', secondary: '#27ae60', border: 'border-emerald-900/30', bg: 'bg-emerald-200/30', text: 'text-emerald-950' },
    // Legacy archer ids
    'archer_drivkraft': { primary: '#14532d', secondary: '#27ae60', border: 'border-emerald-900/30', bg: 'bg-emerald-200/30', text: 'text-emerald-950' },
    'archer_mastring': { primary: '#14532d', secondary: '#27ae60', border: 'border-emerald-900/30', bg: 'bg-emerald-200/30', text: 'text-emerald-950' },
    'archer_talenter': { primary: '#14532d', secondary: '#27ae60', border: 'border-emerald-900/30', bg: 'bg-emerald-200/30', text: 'text-emerald-950' },
    // Wizard (lilla)
    'wizard_ild': { primary: '#7c2d12', secondary: '#ea580c', border: 'border-orange-900/30', bg: 'bg-orange-200/30', text: 'text-orange-950' },
    'wizard_frost': { primary: '#1e3a5f', secondary: '#3b82f6', border: 'border-blue-900/30', bg: 'bg-blue-200/30', text: 'text-blue-950' },
    'wizard_torden': { primary: '#4a1d96', secondary: '#7c3aed', border: 'border-violet-900/30', bg: 'bg-violet-200/30', text: 'text-violet-950' },
    'wizard_evner': { primary: '#4c1d95', secondary: '#8e44ad', border: 'border-purple-900/30', bg: 'bg-purple-200/30', text: 'text-purple-950' },
    'wizard_synergi': { primary: '#4c1d95', secondary: '#8e44ad', border: 'border-purple-900/30', bg: 'bg-purple-200/30', text: 'text-purple-950' },
    // Legacy wizard ids
    'wizard_drivkraft': { primary: '#4c1d95', secondary: '#8e44ad', border: 'border-purple-900/30', bg: 'bg-purple-200/30', text: 'text-purple-950' },
    'wizard_mastring': { primary: '#4c1d95', secondary: '#8e44ad', border: 'border-purple-900/30', bg: 'bg-purple-200/30', text: 'text-purple-950' },
    'wizard_arkan': { primary: '#4c1d95', secondary: '#8e44ad', border: 'border-purple-900/30', bg: 'bg-purple-200/30', text: 'text-purple-950' },
    // Krieger (ny: Virvelvind + Krok-kategori)
    'krieger_virvelvind': { primary: '#7f1d1d', secondary: '#c0392b', border: 'border-red-900/30', bg: 'bg-red-200/30', text: 'text-red-950' },
    'krieger_krok': { primary: '#7f1d1d', secondary: '#c0392b', border: 'border-red-900/30', bg: 'bg-red-200/30', text: 'text-red-950' },
    // Archer (ny: Fantombyge-kategori)
    'archer_fantombyge': { primary: '#14532d', secondary: '#27ae60', border: 'border-emerald-900/30', bg: 'bg-emerald-200/30', text: 'text-emerald-950' },
    // Skald (alle manglet tema — fikset)
    'skald_kvad':   { primary: '#78350f', secondary: '#d4a017', border: 'border-amber-900/30', bg: 'bg-amber-200/30', text: 'text-amber-950' },
    'skald_rytme':  { primary: '#78350f', secondary: '#d4a017', border: 'border-amber-900/30', bg: 'bg-amber-200/30', text: 'text-amber-950' },
    'skald_harpe':  { primary: '#78350f', secondary: '#d4a017', border: 'border-amber-900/30', bg: 'bg-amber-200/30', text: 'text-amber-950' },
    'skald_vers':   { primary: '#713f12', secondary: '#f59e0b', border: 'border-yellow-900/30', bg: 'bg-yellow-200/30', text: 'text-yellow-950' },
    'skald_fiolin': { primary: '#78350f', secondary: '#d4a017', border: 'border-amber-900/30', bg: 'bg-amber-200/30', text: 'text-amber-950' },
    'skald_horn':   { primary: '#713f12', secondary: '#f59e0b', border: 'border-yellow-900/30', bg: 'bg-yellow-200/30', text: 'text-yellow-950' },
    // Paragon (gold/diamond)
    'paragon': { primary: '#b8860b', secondary: '#ffd700', border: 'border-amber-600/50', bg: 'bg-amber-100/50', text: 'text-amber-900' },
};

function topoSort(items: UpgradeConfig[]): UpgradeConfig[] {
    const sorted: UpgradeConfig[] = [];
    const remaining = [...items];
    const inSorted = new Set<string>();
    const itemIds = new Set(items.map(i => i.id));

    while (remaining.length > 0) {
        const idx = remaining.findIndex(item =>
            !item.requires ||
            Object.keys(item.requires).every(id => inSorted.has(id) || !itemIds.has(id))
        );
        if (idx === -1) { sorted.push(...remaining); break; }
        const item = remaining.splice(idx, 1)[0];
        sorted.push(item);
        inSorted.add(item.id);
    }
    return sorted;
}

function groupByChapter(items: UpgradeConfig[], customLabels?: Partial<Record<ChapterId, string>>) {
    const map = new Map<ChapterId, UpgradeConfig[]>();
    for (const item of items) {
        const cid = item.chapterId ?? 'uncategorized';
        if (!map.has(cid)) map.set(cid, []);
        map.get(cid)!.push(item);
    }

    // Convert to array and sort by chapter order
    const groups = Array.from(map.entries()).map(([cid, groupItems]) => {
        const def = CHAPTER_DEFINITIONS[cid] ?? CHAPTER_DEFINITIONS['uncategorized'];
        return {
            chapterId: cid as ChapterId,
            label: customLabels?.[cid as ChapterId] || def.label,
            loreText: def.loreText,
            themeColor: def.themeColor,
            order: def.order,
            items: topoSort(groupItems),
        };
    });

    groups.sort((a, b) => a.order - b.order);
    return groups;
}

const ChapterHeader = ({ label, loreText, themeColor }: { label: string, loreText: string, themeColor: string }) => {
    const firstLetter = label.charAt(0);
    const rest = label.slice(1);

    return (
        <div className="relative pt-4 pb-2 mb-3 -mx-2 px-2" style={{ borderBottom: `1px solid ${themeColor}30` }}>
            <div className="flex items-start gap-1">
                <span className="font-cinzel text-5xl font-black leading-none drop-shadow-sm mt-1" style={{ color: `${themeColor}95` }}>
                    {firstLetter}
                </span>
                <div className="flex flex-col pt-1">
                    <span className="font-cinzel text-xl font-bold tracking-[0.2em] uppercase" style={{ color: themeColor }}>
                        {rest}
                    </span>
                    {loreText && (
                        <span className="font-crimson italic text-[13px] opacity-70 mt-[-2px] whitespace-normal text-balance" style={{ color: themeColor }}>
                            {loreText}
                        </span>
                    )}
                </div>
            </div>
            {/* Asymmetrical border bottom line */}
            <div className="mt-1 h-[2px] w-2/5 max-w-[120px] rounded-r-full" style={{ backgroundColor: themeColor, opacity: 0.6 }} />
        </div>
    );
};

const StatRow = ({ label, value, icon }: { label: string, value: string | number, icon: string }) => (
    <div className="flex items-center justify-between py-1 border-b border-dotted border-slate-300">
        <span className="flex items-center gap-2 text-slate-600">
            {/* Using the icon class string if it's a class, or just a placeholder if it's a name */}
            <span className={`text-xs opacity-50 ${icon.startsWith('icon-') ? icon : ''}`}>{!icon.startsWith('icon-') && '✦'}</span>
            {label}
        </span>
        <span className="font-bold">{value}</span>
    </div>
);

// Tab button component (extracted to fix Rules of Hooks violation)
interface TabButtonProps {
    tabKey: TabKey;
    topOffset: number;
    activeTab: TabKey;
    onTabChange: (key: TabKey) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ tabKey, topOffset, activeTab, onTabChange }) => {
    const config = TABS[tabKey];
    const isActive = activeTab === tabKey;

    // Scale 1.25 for 20px icon (16px × 1.25 = 20px, better fit in 34×18 sprite)
    const { style: spriteStyle } = useSprite({ sprite: config.spriteIcon, scale: 1.25 });

    return (
        <button
            onClick={() => onTabChange(tabKey)}
            className={`absolute right-[-74px] w-[80px] h-[32px]
                flex items-center gap-1 pl-2
                transition-all duration-200
                ${isActive
                    ? 'translate-x-[-4px] brightness-115 drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]'
                    : 'hover:translate-x-[-2px] hover:brightness-105 opacity-85'
                }`}
            style={{
                top: `${topOffset}%`,
                backgroundImage: `url(${config.icon})`,
                backgroundSize: '100% 100%',
                imageRendering: 'pixelated',
                zIndex: 20
            }}
            title={config.title} // Tooltip for accessibility
        >
            {/* Icon container - left-aligned */}
            <div
                className="flex-shrink-0"
                style={{
                    width: '20px',
                    height: '20px',
                    filter: isActive ? 'brightness(1.1) saturate(1.2)' : 'saturate(0.85)'
                }}
            >
                <div style={spriteStyle} />
            </div>

            {/* Label - always visible, improved legibility */}
            <span className={`font-cinzel text-[9px] uppercase tracking-tighter leading-tight
                ${config.color}
                ${isActive ? 'font-bold' : 'font-medium opacity-75'}
                [text-shadow:_0_1px_2px_rgb(0_0_0_/_50%)]`}
            >
                {config.title}
            </span>
        </button>
    );
};

export const FantasyBook: React.FC<FantasyBookProps> = React.memo(({
    isOpen,
    mode,
    onClose,
    actions,
    isMultiplayer,
    isWaitingReady,
    readyPlayersCount = 0,
    expectedPlayersCount = 1,
    readyReason,
    onExitGame
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('character');
    const [activeShopCategory, setActiveShopCategory] = useState<string>(
        () => CLASS_CONFIGS['krieger'].shopCategories[0].id
    );

    // Class config
    const rawPlayerClass = useGameRegistry('playerClass', 'krieger');
    const playerClass = resolveClassId(rawPlayerClass);
    const classConfig = CLASS_CONFIGS[playerClass];

    // Subscribe to Registry for Real-Time Updates
    const level = useGameRegistry('gameLevel', 1);
    const coins = useGameRegistry('playerCoins', 0);
    const upgradeLevels = useGameRegistry<Record<string, number>>('upgradeLevels', {});
    const bossComingUp = useGameRegistry('bossComingUp', -1);
    const partyState = useGameRegistry<{ id: string, name: string, isDead: boolean }[]>('partyState', []);
    const reviveCount = useGameRegistry('reviveCount', 0);

    // Hover tooltip for detailed descriptions
    const [hoveredItem, setHoveredItem] = useState<(UpgradeConfig | ParagonUpgradeConfig) | null>(null);
    const [hoverAnchorRect, setHoverAnchorRect] = useState<DOMRect | null>(null);

    // Purchase confirmation for upgrades with purchaseWarning
    const [pendingPurchase, setPendingPurchase] = useState<{ item: UpgradeConfig; cost: number } | null>(null);

    // Detailed Stats for Status Page
    const maxHp = useGameRegistry('playerMaxHP', 100);
    const damage = useGameRegistry('playerDamage', 10);
    const speed = useGameRegistry('playerSpeed', 200);
    const armor = useGameRegistry('playerArmor', 0);
    const regen = useGameRegistry('playerRegen', 0);
    const attackSpeed = useGameRegistry('playerAttackSpeed', 1);

    // Auto-switch tab based on mode when opening
    useEffect(() => {
        if (isOpen) {
            setActiveTab('upgrades');
        }
    }, [isOpen, mode]);

    // Reset category when class changes
    useEffect(() => {
        setActiveShopCategory(classConfig.shopCategories[0].id);
    }, [playerClass]);

    // Page turn sound effect
    useEffect(() => {
        if (isOpen) {
            import('../../game/AudioManager').then(({ AudioManager }) => {
                AudioManager.instance.playSFX('page_turn');
            });
        }
    }, [activeTab, isOpen]);

    const paragonLevel = useGameRegistry('paragonLevel', 0) as number;

    const shopItems = React.useMemo(() => {
        // Paragon category: show Paragon-exclusive upgrades filtered by tier
        if (activeShopCategory === 'paragon') {
            return PARAGON_UPGRADES.filter(u => paragonLevel >= u.paragonRequired);
        }

        const allUpgrades = [...UPGRADES, ...CLASS_UPGRADES];
        return allUpgrades.filter(u => {
            const catId = u.shopCategoryId ?? u.category.toLowerCase();
            if (catId !== activeShopCategory) return false;
            if (u.classRestriction && u.classRestriction !== playerClass) return false;
            if (u.id === 'unlock_bow') return false;
            return true;
        });
    }, [activeShopCategory, playerClass, paragonLevel]);

    const groupedShopItems = React.useMemo(() => {
        const activeCategoryDef = classConfig.shopCategories.find(c => c.id === activeShopCategory);
        return groupByChapter(shopItems, activeCategoryDef?.chapterLabels);
    }, [shopItems, activeShopCategory, classConfig]);

    const renderStatusPage = () => (
        <div className="space-y-4 font-crimson text-slate-800">
            <div className="flex items-center gap-4 mb-4 border-b border-red-900/20 pb-2">
                <div className="w-16 h-16 bg-slate-200 border-2 border-slate-400 rounded-full flex items-center justify-center overflow-hidden">
                    {/* Placeholder Portrait */}
                    <span className="text-2xl">👤</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold font-cinzel text-red-900">Map Level {level}</h3>
                    <p className="text-xs italic text-slate-500">The Kringsjå Defender</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <StatRow label="Vitality" value={`${Math.round(maxHp)} HP`} icon="heart" />
                <StatRow label="Strength" value={Math.round(damage)} icon="sword" />
                <StatRow label="Speed" value={speed} icon="boot" />
                <StatRow label="Defense" value={armor} icon="shield" />
                <StatRow label="Regen" value={`${regen}/s`} icon="potion" />
                <StatRow label="Atk Spd" value={`${((attackSpeed - 1) * 100).toFixed(0)}%`} icon="flash" />
            </div>

            <div className="mt-8 pt-4 border-t border-red-900/10">
                <h4 className="font-bold text-red-900 mb-2">Equipment</h4>
                <div className="flex gap-2">
                    <div className="p-2 bg-slate-100 border border-slate-300 rounded text-center w-full">
                        <div className="text-xs text-slate-400 uppercase">Main Hand</div>
                        <div className="font-bold">Rusty Sword</div>
                    </div>
                </div>
            </div>
        </div>
    );



    // Grimoire (Level Up) logic removed as per GDD - XP replaced by Gold economy

    // Keeping original function for reference/deletion but effectively replacing usage below
    // const renderGrimoirePage = ... (Deleted)

    // --- MERCHANT LEFTS PAGE: Categories ---
    const renderMerchantCategories = () => {
        const baseCategories = classConfig.shopCategories;
        // Add Paragon category when player has reached Paragon 1+
        const categories = paragonLevel > 0
            ? [...baseCategories, { id: 'paragon', label: 'PARAGON', icon: 'item_synergy_rune', isExclusive: false }]
            : baseCategories;

        return (
            <div className="flex flex-col h-full font-crimson">
                {/* Boss warning banner */}
                {bossComingUp >= 0 && (
                    <div className="mb-4 rounded-xl border border-red-600/60 bg-red-950/70 px-4 py-3 flex items-center gap-3 shadow-[0_0_20px_rgba(180,0,0,0.4)]">
                        <span className="text-2xl leading-none">💀</span>
                        <div>
                            <div className="font-cinzel font-black text-red-400 text-sm tracking-wider uppercase" style={{ textShadow: '0 0 10px rgba(220,38,38,0.8)' }}>
                                Boss Battle venter!
                            </div>
                            <div className="text-red-300/70 text-xs mt-0.5 font-crimson">
                                Kjøp oppgraderinger – neste er en sjef!
                            </div>
                        </div>
                    </div>
                )}

                {/* Purse: Avant-Garde Integrated Parchment Panel */}
                <div className="mb-2 relative flex flex-col items-center justify-center py-2 px-2 group">
                    {/* Decorative Top Border */}
                    <div className="w-full flex items-center justify-center gap-2 opacity-70 mb-2">
                        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-amber-900/60" />
                        <span className="text-[9px] font-cinzel text-amber-950 uppercase tracking-[0.25em] font-bold">The Sovereign Purse</span>
                        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-900/60" />
                    </div>

                    <div className="flex items-center gap-5 transition-transform duration-500 group-hover:scale-[1.02]">
                        {/* Coin Icon from TopHUD */}
                        <div className="relative">
                            <motion.div
                                animate={{ y: [-1, 1, -1] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <ItemIcon
                                    icon="item_gold_coin"
                                    size="lg"
                                    className="drop-shadow-[0_4px_8px_rgba(180,83,9,0.3)] filter brightness-110"
                                />
                            </motion.div>
                            <motion.div
                                animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.1, 0.9] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 bg-amber-400/30 blur-xl -z-10 rounded-full"
                            />
                        </div>

                        {/* Amount */}
                        <div className="flex flex-col items-start pr-4 relative">
                            <span className="text-4xl font-black text-amber-950/90 font-cinzel leading-none tabular-nums tracking-tighter drop-shadow-sm">
                                {coins}
                            </span>

                            {/* Cheat Sparkle (The Blossom of Prosperity) */}
                            <motion.button
                                whileHover={{ scale: 1.5, rotate: 90 }}
                                whileTap={{ scale: 0.8 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    actions.onCheatGold?.();
                                }}
                                className="absolute -top-1 -right-2 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity cursor-help"
                                title="Divine Blessing"
                            >
                                <span className="text-amber-400 text-xs">✦</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Decorative Bottom Border */}
                    <div className="w-full flex items-center justify-center mt-2 opacity-30">
                        <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-amber-900/50 to-transparent" />
                    </div>
                </div>

                {/* Klasse-indikator */}
                <div className="flex items-center gap-1.5 mb-1 px-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: classConfig.color }} />
                    <span className="text-[10px] font-cinzel uppercase tracking-widest opacity-50" style={{ color: classConfig.color }}>
                        {classConfig.displayName}
                    </span>
                </div>

                <div className="space-y-2 flex-1 px-1">
                    {categories.map((cat) => {
                        const theme = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES['karakter'];
                        const isActive = activeShopCategory === cat.id;

                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveShopCategory(cat.id)}
                                style={isActive ? { backgroundColor: theme.primary + '33', borderColor: theme.primary } : {}}
                                className={`w-full flex items-center gap-4 p-3 rounded border transition-all duration-200 group relative overflow-hidden
                                    ${isActive
                                        ? `shadow-inner`
                                        : 'bg-transparent border-transparent hover:bg-slate-100/50 hover:translate-x-1'
                                    }
                                `}
                            >
                                <div
                                    style={isActive ? { backgroundColor: theme.primary + '33', borderColor: theme.primary, color: theme.primary } : {}}
                                    className={`w-10 h-10 flex items-center justify-center rounded border transition-colors
                                    ${!isActive ? `bg-slate-100 border-slate-300 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-600` : ''}
                                `}>
                                    <ItemIcon icon={cat.icon as ItemIconKey} size="md" />
                                </div>
                                <span className={`font-cinzel text-xl ${isActive ? `${theme.text} font-bold` : 'text-slate-600 group-hover:text-slate-800'}`}>
                                    {cat.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-indicator"
                                        style={{ backgroundColor: theme.primary }}
                                        className={`ml-auto w-2 h-2 rounded-full`}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- MERCHANT RIGHT PAGE: Items ---
    const renderMerchantItems = () => {
        const theme = CATEGORY_THEMES[activeShopCategory] || CATEGORY_THEMES['karakter'];

        return (
            <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {isMultiplayer && partyState.length > 0 && (
                            partyState.filter(p => p.isDead).map(p => {
                                const reviveCost = 500 + (reviveCount * 500);
                                const canAfford = coins >= reviveCost;
                                return (
                                    <motion.div
                                        key={`revive-${p.id}`}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={`flex p-4 bg-red-950/60 border border-red-500/50 rounded-lg mb-3 shadow-[0_0_15px_rgba(255,0,0,0.15)] glow-pulse`}
                                    >
                                        <div className="flex-1 flex flex-col justify-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 flex items-center justify-center bg-red-900/50 rounded-lg border border-red-500/50">
                                                    <span className="text-red-300 text-2xl">☠️</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-xl text-red-100 block">Gjenoppliv {p.name}</span>
                                                    <span className="text-sm text-red-300/80 italic font-crimson">Deres sjel streifer rundt... Bring dem tilbake.</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col w-28 shrink-0 justify-center items-end">
                                            <button
                                                onClick={() => actions.onBuyRevive?.(p.id, reviveCost)}
                                                disabled={!canAfford}
                                                className={`w-full py-2 text-base font-bold border rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md
                                                    ${canAfford
                                                        ? 'bg-amber-400 border-amber-600 text-amber-900 hover:bg-amber-300 hover:-translate-y-0.5 active:translate-y-0'
                                                        : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed grayscale'}
                                                `}
                                            >
                                                <span>{reviveCost}</span>
                                                <div className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-[0_0_5px_rgba(180,83,9,0.5)]" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}

                        {shopItems.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={`flex flex-col items-center justify-center h-48 text-center ${theme.text} opacity-40`}
                            >
                                <span className="text-4xl mb-2">🕸️</span>
                                <p className="italic text-sm">Nothing to see here yet...</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                className="grid grid-cols-1 gap-3 pb-2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {groupedShopItems.map(({ chapterId, label, loreText, themeColor: chapterThemeColor, items: groupItems }) => (
                                    <div key={chapterId} className="mb-6 relative">
                                        <ChapterHeader label={label} loreText={loreText} themeColor={chapterThemeColor} />

                                        <div className="flex flex-col gap-3">
                                            {groupItems.map(item => {
                                                const lvl = upgradeLevels[item.id] || 0;
                                                const cost = Math.floor(item.basePrice * Math.pow(item.priceScale, lvl));
                                                const canAfford = coins >= cost;
                                                const isMaxed = lvl >= item.maxLevel;
                                                const isExclusive = !!item.classRestriction;

                                                // Check requirements (search combined pool)
                                                const allUpgradesForLookup = [...UPGRADES, ...CLASS_UPGRADES];
                                                let reqMet = true;
                                                let reqText = '';
                                                // Paragon tier requirement
                                                const paragonReq = (item as ParagonUpgradeConfig).paragonRequired;
                                                if (paragonReq && paragonLevel < paragonReq) {
                                                    reqMet = false;
                                                    reqText += `${getParagonTierName(paragonReq)} kreves. `;
                                                }
                                                if (item.requires) {
                                                    for (const [rId, rLvl] of Object.entries(item.requires)) {
                                                        if ((upgradeLevels[rId] || 0) < rLvl) {
                                                            reqMet = false;
                                                            const rName = allUpgradesForLookup.find(u => u.id === rId)?.title || rId;
                                                            reqText += `${rName} nivå ${rLvl} kreves. `;
                                                        }
                                                    }
                                                }

                                                return (
                                                    <motion.div
                                                        key={item.id}
                                                        initial={{ opacity: 0, x: 10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        onMouseEnter={(e) => {
                                                            if ('detailedDescription' in item && (item as UpgradeConfig).detailedDescription) {
                                                                setHoveredItem(item);
                                                                setHoverAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                                                            }
                                                        }}
                                                        onMouseLeave={() => { setHoveredItem(null); setHoverAnchorRect(null); }}
                                                        className={`flex p-4 border rounded-lg transition-all group relative overflow-hidden gap-4
                                                ${!reqMet
                                                                ? 'bg-slate-200/70 border-slate-400/50 grayscale opacity-80'
                                                                : `hover:brightness-[1.03] shadow-sm hover:shadow`
                                                            }`}
                                                        style={!reqMet ? {} : (isExclusive ? {
                                                            borderColor: classConfig.color + '66',
                                                            background: `linear-gradient(135deg, ${classConfig.color}18 0%, transparent 75%), ${chapterThemeColor}15`,
                                                        } : {
                                                            backgroundColor: `${chapterThemeColor}10`,
                                                            borderColor: `${chapterThemeColor}30`,
                                                        })}
                                                    >
                                                        {/* Left Side: Info */}
                                                        <div className="flex-1 flex flex-col">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className={`w-10 h-10 flex items-center justify-center rounded-lg border 
                                                        ${!reqMet ? 'bg-slate-300/60 border-slate-400' : `bg-white/70`}`}
                                                                    style={reqMet ? { borderColor: `${chapterThemeColor}40` } : {}}>
                                                                    {isItemSpriteIcon(item.icon)
                                                                        ? <ItemIcon
                                                                            icon={item.icon as ItemIconKey}
                                                                            size="md"
                                                                            style={item.iconTint ? { filter: item.iconTint } : {}}
                                                                        />
                                                                        : <div
                                                                            className={`${item.icon} text-xl`}
                                                                            style={{ color: chapterThemeColor, ...(item.iconTint ? { filter: item.iconTint } : {}) }}
                                                                        />
                                                                    }
                                                                </div>
                                                                <span className={`font-bold text-xl ${!reqMet ? 'text-slate-600' : ''}`}
                                                                    style={reqMet ? { color: chapterThemeColor, filter: 'brightness(0.7)' } : {}}>
                                                                    {item.title}
                                                                </span>
                                                            </div>

                                                            <div className={`text-lg pl-1 leading-snug font-crimson mt-2
                                                    ${!reqMet ? 'text-slate-600' : `opacity-90`}
                                                `}
                                                                style={reqMet ? { color: chapterThemeColor, filter: 'brightness(0.5)' } : {}}>
                                                                {item.summary} ({item.value.prefix || ''}{item.value.getValue(lvl + 1)}{item.value.suffix || ''})
                                                            </div>
                                                            {!reqMet && (
                                                                <div className="text-sm text-red-800 font-bold mt-3 p-2 bg-red-100/60 rounded border border-red-900/20 flex items-center gap-2">
                                                                    <span>🔒</span>
                                                                    <span>{reqText}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Right Side: Action & Level */}
                                                        <div className="flex flex-col w-28 shrink-0 justify-between items-end gap-2">
                                                            <span className={`text-3xl font-bold ${!reqMet ? 'text-slate-500' : ''} opacity-90 block mt-1 tracking-tighter`}
                                                                style={reqMet ? { color: chapterThemeColor, filter: 'brightness(0.7)' } : {}}>
                                                                {lvl}/{item.maxLevel}
                                                            </span>

                                                            <div className="w-full mt-auto">
                                                                {isMaxed ? (
                                                                    <div className={`w-full py-2 text-sm font-bold bg-black/5 rounded border text-center uppercase tracking-widest`}
                                                                        style={{ color: chapterThemeColor, borderColor: `${chapterThemeColor}40` }}>
                                                                        Max
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            if ('purchaseWarning' in item && (item as UpgradeConfig).purchaseWarning) {
                                                                                setPendingPurchase({ item: item as UpgradeConfig, cost });
                                                                            } else {
                                                                                actions.onBuyUpgrade(item.id, cost);
                                                                            }
                                                                        }}
                                                                        disabled={!canAfford || !reqMet}
                                                                        className={`w-full py-2 text-base font-bold border rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm
                                                                ${canAfford && reqMet
                                                                                ? 'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-50 hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner'
                                                                                : 'bg-slate-200/80 border-slate-400/50 text-slate-500 cursor-not-allowed opacity-80'}
                                                            `}
                                                                    >
                                                                        <span>{cost}</span>
                                                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-[0_0_5px_rgba(180,83,9,0.5)]" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-col items-center gap-3"
                    >
                        {/* Level Complete Banner */}
                        {mode === 'shop' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 0.4 }}
                                className="px-10 py-2 bg-amber-950/90 border-2 border-amber-500/60 rounded-lg shadow-lg text-center"
                            >
                                <span className="text-amber-300 font-cinzel font-bold text-2xl tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                    ⚔ Level {level} fullført! ⚔
                                </span>
                            </motion.div>
                        )}

                        {/* Book */}
                        <div
                            className="relative drop-shadow-2xl"
                            style={{
                                width: 'var(--book-width, 1000px)',
                                aspectRatio: '227/134',
                            }}
                        >
                            {/* Book Background */}
                            <img
                                src={bookOpen}
                                alt="Open Book"
                                className="absolute inset-0 w-full h-full object-contain image-rendering-pixelated pointer-events-none"
                            />

                            {/* Tabs */}
                            <TabButton tabKey="character" topOffset={15} activeTab={activeTab} onTabChange={setActiveTab} />
                            <TabButton tabKey="upgrades" topOffset={30} activeTab={activeTab} onTabChange={setActiveTab} />
                            <TabButton tabKey="achievements" topOffset={45} activeTab={activeTab} onTabChange={setActiveTab} />
                            <TabButton tabKey="settings" topOffset={60} activeTab={activeTab} onTabChange={setActiveTab} />

                            {/* Achievement Full-Book Overlay — covers entire book, sits above content layer */}
                            <AnimatePresence>
                                {activeTab === 'achievements' && (
                                    <motion.div
                                        key="achievement-book-overlay"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute inset-0 z-10"
                                    >
                                        <AchievementBookOverlay />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Content Layer */}
                            <motion.div
                                className="absolute inset-0 grid grid-cols-2 p-[6%] gap-[4%] pt-[3%] pb-[8%] font-crimson text-slate-900 overflow-hidden"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.18, duration: 0.2 }}
                            >
                                {activeTab === 'settings' ? (
                                    <div className="col-span-2 h-full">
                                        <SettingsContent inBookContext={true} />
                                    </div>
                                ) : activeTab === 'achievements' ? null : (
                                    <>
                                        {/* Left Page: Main Content Area */}
                                        <div className="px-5 py-3 overflow-y-auto custom-scrollbar h-full pr-4 relative overflow-x-hidden">
                                            {activeTab === 'character' && (
                                                <>
                                                    <h2 className={`text-2xl font-bold mb-4 font-cinzel border-b-2 pb-2 ${TABS[activeTab].color} border-current opacity-80 sticky top-0 bg-[#e3dac9] z-10`}>
                                                        {TABS[activeTab].title}
                                                    </h2>
                                                    {renderStatusPage()}
                                                </>
                                            )}
                                            {activeTab === 'upgrades' && renderMerchantCategories()}
                                        </div>

                                        {/* Right Page: Supplemental / Notes / Controls / Merchant Items */}
                                        <div className="px-5 py-3 h-full flex flex-col justify-between relative overflow-x-hidden">
                                            {activeTab === 'upgrades' && renderMerchantItems()}

                                            {activeTab === 'character' && (
                                                <>
                                                    <div className="space-y-4">
                                                        <h3 className="text-lg font-bold text-amber-900/70 font-cinzel border-b border-amber-900/10 pb-1">Notes</h3>
                                                        <div className="text-sm italic text-slate-600 font-crimson italic leading-relaxed opacity-80">
                                                            {mode === 'shop' && "Ah, a customer! Standard exchange rates apply. No refunds on cursed items."}
                                                            {mode === 'view' && "\"To defeat the darkness, one must first understand their own strength.\""}
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-end pt-4 border-t border-amber-900/10">
                                                        <FantasyButton
                                                            variant="danger"
                                                            onClick={onClose}
                                                            className="scale-90 origin-bottom-right"
                                                            label="Close Book"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </div>

                        {/* Buttons below book */}
                        <div
                            className="flex items-center justify-between"
                            style={{ width: 'var(--book-width, 1000px)' }}
                        >
                            {/* LEFT: Exit to menu */}
                            {onExitGame ? (
                                <FantasyButton
                                    variant="secondary"
                                    onClick={onExitGame}
                                    label="Avslutt spill"
                                    className="scale-90 origin-bottom-left opacity-70 hover:opacity-100"
                                />
                            ) : (
                                <div />
                            )}

                            {/* RIGHT: Primary action */}
                            {mode === 'shop' ? (
                                <FantasyButton
                                    variant={bossComingUp >= 0 && !isMultiplayer ? 'danger' : 'success'}
                                    onClick={onClose}
                                    label={
                                        isMultiplayer
                                            ? (isWaitingReady && readyReason === 'next_level' ? `Venter (${readyPlayersCount}/${expectedPlayersCount})` : 'Klar')
                                            : (bossComingUp >= 0 ? '💀 Møt sjefen' : `Til level ${level + 1}`)
                                    }
                                    disabled={isWaitingReady}
                                />
                            ) : (
                                <FantasyButton
                                    variant="secondary"
                                    onClick={onClose}
                                    label={
                                        isMultiplayer
                                            ? (isWaitingReady && readyReason === 'unpause' ? `Venter (${readyPlayersCount}/${expectedPlayersCount})` : 'Klar')
                                            : "Lukk boken"
                                    }
                                    disabled={isWaitingReady}
                                />
                            )}
                        </div>
                    </motion.div>

                    {/* Hover Tooltip for detailed descriptions */}
                    <AnimatePresence>
                        {hoveredItem && hoverAnchorRect && 'detailedDescription' in hoveredItem && (hoveredItem as UpgradeConfig).detailedDescription && (
                            <motion.div
                                key="upgrade-tooltip"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                style={{
                                    position: 'fixed',
                                    top: Math.max(8, hoverAnchorRect.top - 8),
                                    left: Math.min(hoverAnchorRect.right + 12, window.innerWidth - 370),
                                    zIndex: 9999,
                                    pointerEvents: 'none',
                                    maxWidth: 350,
                                }}
                                className="bg-slate-900/95 border border-amber-500/50 rounded-lg p-4 shadow-2xl backdrop-blur-sm"
                            >
                                <div className="text-amber-300 font-cinzel font-bold text-base mb-2 border-b border-amber-500/30 pb-2">
                                    {hoveredItem.title}
                                </div>
                                <div className="text-slate-200 text-sm leading-relaxed font-crimson">
                                    {(hoveredItem as UpgradeConfig).detailedDescription}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Purchase Confirmation Modal */}
                    <AnimatePresence>
                        {pendingPurchase && (
                            <motion.div
                                key="purchase-confirm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                                onClick={() => setPendingPurchase(null)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 10 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    className="bg-slate-900/95 border-2 border-amber-500/60 rounded-xl p-6 shadow-2xl max-w-md mx-4"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="text-amber-400 font-cinzel font-bold text-xl mb-4 text-center">
                                        ⚠ {pendingPurchase.item.title}
                                    </div>
                                    <div className="text-slate-200 text-base leading-relaxed font-crimson mb-6 text-center">
                                        {pendingPurchase.item.purchaseWarning}
                                    </div>
                                    <div className="flex gap-4 justify-center">
                                        <button
                                            onClick={() => setPendingPurchase(null)}
                                            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg border border-slate-500 transition-colors"
                                        >
                                            Avbryt
                                        </button>
                                        <button
                                            onClick={() => {
                                                actions.onBuyUpgrade(pendingPurchase.item.id, pendingPurchase.cost);
                                                setPendingPurchase(null);
                                            }}
                                            className="px-6 py-2.5 bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold rounded-lg border border-amber-500 transition-colors"
                                        >
                                            Kjøp likevel
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </AnimatePresence>
    );
});
