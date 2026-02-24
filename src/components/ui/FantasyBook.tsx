import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import bookOpen from '../../assets/ui/fantasy/containers/book_open.png';
import tabRed from '../../assets/ui/fantasy/tabs/red.png';
import tabGreen from '../../assets/ui/fantasy/tabs/green.png';
import { UPGRADES, type UpgradeConfig, isItemSpriteIcon } from '../../config/upgrades';
import { ItemIcon, type ItemIconKey } from './ItemIcon';
import { useGameRegistry } from '../../hooks/useGameRegistry';
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
    }
}

type TabKey = 'character' | 'upgrades';

const TABS: Record<TabKey, { title: string; icon: string; color: string; locked?: boolean }> = {
    character: { title: 'Character', icon: tabRed, color: 'text-red-900' },
    upgrades: { title: 'Upgrades', icon: tabGreen, color: 'text-emerald-900' },
};

const CATEGORY_THEMES: Record<string, { primary: string; secondary: string; border: string; bg: string; text: string }> = {
    'Karakter': { primary: '#fbbf24', secondary: '#f59e0b', border: 'border-amber-500/30', bg: 'bg-amber-950/40', text: 'text-amber-100' },
    'Sverd': { primary: '#f87171', secondary: '#ef4444', border: 'border-red-500/30', bg: 'bg-red-950/40', text: 'text-red-100' },
    'Bue': { primary: '#34d399', secondary: '#10b981', border: 'border-emerald-500/30', bg: 'bg-emerald-950/40', text: 'text-emerald-100' },
    'Magi': { primary: '#818cf8', secondary: '#6366f1', border: 'border-indigo-500/30', bg: 'bg-indigo-950/40', text: 'text-indigo-100' },
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

export const FantasyBook: React.FC<FantasyBookProps> = React.memo(({
    isOpen,
    mode,
    onClose,
    actions
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('character');
    const [activeShopCategory, setActiveShopCategory] = useState<UpgradeConfig['category']>('Sverd');

    // Subscribe to Registry for Real-Time Updates
    const level = useGameRegistry('gameLevel', 1);
    const coins = useGameRegistry('playerCoins', 0);
    const upgradeLevels = useGameRegistry<Record<string, number>>('upgradeLevels', {});
    const bossComingUp = useGameRegistry('bossComingUp', -1);

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
            if (mode === 'shop') setActiveTab('upgrades');
            else setActiveTab('character');
        }
    }, [isOpen, mode]);

    const renderTabButton = (key: TabKey, topOffset: number) => {
        const config = TABS[key];
        const isActive = activeTab === key;

        return (
            <button
                onClick={() => setActiveTab(key)}
                className={`absolute right-[-74px] w-[80px] h-[32px] flex items-center pl-3 transition-all duration-200 
                    ${isActive ? 'translate-x-[-4px] brightness-110' : 'hover:translate-x-[-2px] opacity-80'}`}
                style={{
                    top: `${topOffset}%`,
                    backgroundImage: `url(${config.icon})`,
                    backgroundSize: '100% 100%',
                    imageRendering: 'pixelated',
                    zIndex: isActive ? 10 : 0
                }}
            >
                <span className={`font-cinzel text-[10px] uppercase tracking-tighter ${config.color} 
                    ${isActive ? 'font-bold' : 'opacity-70'}`}>
                    {config.title}
                </span>
            </button>
        );
    };

    const renderStatusPage = () => (
        <div className="space-y-4 font-crimson text-slate-800 animate-in fade-in duration-300">
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
        const categories: { key: UpgradeConfig['category']; label: string; icon: ItemIconKey }[] = [
            { key: 'Sverd', label: 'Sverd', icon: 'item_sword' },
            { key: 'Bue', label: 'Bue', icon: 'item_bow' },
            { key: 'Karakter', label: 'Karakter', icon: 'item_heart_status' },
            { key: 'Magi', label: 'Magi', icon: 'item_magic_staff' },
        ];

        return (
            <div className="flex flex-col h-full font-crimson animate-in fade-in duration-300">
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

                {/* Purse: High-Contrast Sovereign Panel */}
                <div className="mb-8">
                    <div className="relative overflow-hidden bg-slate-950/60 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 shadow-2xl group hover:bg-slate-900/70 transition-all duration-500">
                        {/* Dynamic Background Glow */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/10 blur-3xl rounded-full" />

                        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400/80 mb-3 font-bold m-text-shadow-strong">Merchant's Sovereign Purse</div>
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-amber-400 border-2 border-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.6)] flex items-center justify-center m-icon-coin scale-150" />
                                <motion.div
                                    animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 rounded-full bg-amber-500 blur-md -z-10"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-4xl font-black text-amber-50 m-text-shadow-strong tracking-tighter tabular-nums leading-none">{coins}</span>
                                <span className="text-[9px] text-amber-400/70 uppercase font-black tracking-widest mt-1">Total Gold Holdings</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 flex-1 px-1">
                    {categories.map((cat) => {
                        const theme = CATEGORY_THEMES[cat.key] || CATEGORY_THEMES['Karakter'];
                        const isActive = activeShopCategory === cat.key;

                        return (
                            <button
                                key={cat.key}
                                onClick={() => setActiveShopCategory(cat.key)}
                                className={`w-full flex items-center gap-4 p-3 rounded border transition-all duration-200 group relative overflow-hidden
                                    ${isActive
                                        ? `${theme.bg} border-${theme.primary} shadow-inner`
                                        : 'bg-transparent border-transparent hover:bg-slate-100/50 hover:translate-x-1'
                                    }
                                `}
                            >
                                <div className={`w-10 h-10 flex items-center justify-center rounded border transition-colors
                                    ${isActive
                                        ? `bg-${theme.primary}/20 border-${theme.primary} text-${theme.primary}`
                                        : `bg-slate-100 border-slate-300 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-600`
                                    }
                                `}>
                                    <ItemIcon icon={cat.icon} size="md" />
                                </div>
                                <span className={`font-cinzel text-xl ${isActive ? `${theme.text} font-bold` : 'text-slate-600 group-hover:text-slate-800'}`}>
                                    {cat.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-indicator"
                                        className={`ml-auto w-2 h-2 rounded-full bg-${theme.primary}`}
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
        const shopItems = UPGRADES.filter(u => {
            if (u.category !== activeShopCategory) return false;
            if (u.id === 'unlock_bow') return false; // Bow is always unlocked, so hide this
            return true;
        });
        const theme = CATEGORY_THEMES[activeShopCategory] || CATEGORY_THEMES['Karakter'];

        return (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                    <AnimatePresence mode="popLayout" initial={false}>
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
                                {shopItems.map(item => {
                                    const lvl = upgradeLevels[item.id] || 0;
                                    const cost = Math.floor(item.basePrice * Math.pow(item.priceScale, lvl));
                                    const canAfford = coins >= cost;
                                    const isMaxed = lvl >= item.maxLevel;

                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`flex flex-col p-4 ${theme.bg} border ${theme.border} rounded-lg hover:brightness-105 transition-all group relative overflow-hidden`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 flex items-center justify-center bg-white/50 rounded-lg border ${theme.border}`}>
                                                        {isItemSpriteIcon(item.icon)
                                                            ? <ItemIcon icon={item.icon as ItemIconKey} size="md" />
                                                            : <div className={`${item.icon} ${theme.text} text-lg`} />
                                                        }
                                                    </div>
                                                    <span className={`font-bold text-lg ${theme.text}`}>{item.title}</span>
                                                </div>
                                                <span className={`text-xs font-bold ${theme.text} bg-${theme.primary}/20 px-2 py-1 rounded`}>Lvl {lvl}/{item.maxLevel}</span>
                                            </div>

                                            <div className={`text-sm ${theme.text} opacity-80 mb-4 pl-1 leading-snug font-crimson`}>
                                                {item.description(lvl + 1)}
                                            </div>

                                            <div className="mt-auto">
                                                {isMaxed ? (
                                                    <div className={`w-full py-2 text-xs font-bold ${theme.text} bg-${theme.primary}/10 rounded border ${theme.border} text-center uppercase tracking-widest`}>
                                                        Mastered
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => actions.onBuyUpgrade(item.id, cost)}
                                                        disabled={!canAfford}
                                                        className={`w-full py-2.5 text-sm font-bold border rounded-lg transition-all flex items-center justify-center gap-2 shadow-md
                                                            ${canAfford
                                                                ? 'bg-amber-400 border-amber-600 text-amber-900 hover:bg-amber-300 hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner'
                                                                : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed grayscale'}
                                                        `}
                                                    >
                                                        <span>Buy for {cost}</span>
                                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-[0_0_5px_rgba(180,83,9,0.5)]" />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )
                                })}
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
                            {renderTabButton('character', 15)}
                            {renderTabButton('upgrades', 30)}

                            {/* Content Layer */}
                            <div className="absolute inset-0 grid grid-cols-2 p-[6%] gap-[4%] pt-[3%] pb-[8%] font-crimson text-slate-900 overflow-hidden">
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
                            </div>
                        </div>

                        {/* Buttons below book */}
                        <div className="flex gap-3">
                            {mode === 'shop' ? (
                                <FantasyButton
                                    variant={bossComingUp >= 0 ? 'danger' : 'success'}
                                    onClick={onClose}
                                    label={bossComingUp >= 0 ? '💀 Møt sjefen' : `Til level ${level + 1}`}
                                />
                            ) : (
                                <FantasyButton
                                    variant="secondary"
                                    onClick={onClose}
                                    label="Lukk boken"
                                />
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});
