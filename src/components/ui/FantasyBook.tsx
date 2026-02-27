import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import bookOpen from '../../assets/ui/fantasy/containers/book_open.png';
import tabRed from '../../assets/ui/fantasy/tabs/red.png';
import tabGreen from '../../assets/ui/fantasy/tabs/green.png';
import tabYellow from '../../assets/ui/fantasy/tabs/yellow.png';
import { UPGRADES, type UpgradeConfig, isItemSpriteIcon } from '../../config/upgrades';
import { ItemIcon, type ItemIconKey } from './ItemIcon';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { SettingsContent } from './SettingsContent';
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
    }

    // Multiplayer State
    isMultiplayer?: boolean;
    isWaitingReady?: boolean;
    readyPlayersCount?: number;
    expectedPlayersCount?: number;
    readyReason?: 'unpause' | 'next_level' | 'retry' | null;
}

type TabKey = 'character' | 'upgrades' | 'settings';

const TABS: Record<TabKey, { title: string; icon: string; color: string; locked?: boolean }> = {
    character: { title: 'Character', icon: tabRed, color: 'text-red-900' },
    upgrades: { title: 'Upgrades', icon: tabGreen, color: 'text-emerald-900' },
    settings: { title: 'Settings', icon: tabYellow, color: 'text-amber-900' },
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
    actions,
    isMultiplayer,
    isWaitingReady,
    readyPlayersCount = 0,
    expectedPlayersCount = 1,
    readyReason
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('character');
    const [activeShopCategory, setActiveShopCategory] = useState<UpgradeConfig['category']>('Sverd');

    // Subscribe to Registry for Real-Time Updates
    const level = useGameRegistry('gameLevel', 1);
    const coins = useGameRegistry('playerCoins', 0);
    const upgradeLevels = useGameRegistry<Record<string, number>>('upgradeLevels', {});
    const bossComingUp = useGameRegistry('bossComingUp', -1);
    const partyState = useGameRegistry<{ id: string, name: string, isDead: boolean }[]>('partyState', []);
    const reviveCount = useGameRegistry('reviveCount', 0);

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

    // Page turn sound effect
    useEffect(() => {
        if (isOpen) {
            import('../../game/AudioManager').then(({ AudioManager }) => {
                AudioManager.instance.playSFX('page_turn');
            });
        }
    }, [activeTab, isOpen]);

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
        const categories: { key: UpgradeConfig['category']; label: string; icon: ItemIconKey }[] = [
            { key: 'Sverd', label: 'Sverd', icon: 'item_sword' },
            { key: 'Bue', label: 'Bue', icon: 'item_bow' },
            { key: 'Karakter', label: 'Karakter', icon: 'item_heart_status' },
            { key: 'Magi', label: 'Magi', icon: 'item_magic_staff' },
        ];

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
                        <div className="flex flex-col items-start pr-4">
                            <span className="text-4xl font-black text-amber-950/90 font-cinzel leading-none tabular-nums tracking-tighter drop-shadow-sm">
                                {coins}
                            </span>
                        </div>
                    </div>

                    {/* Decorative Bottom Border */}
                    <div className="w-full flex items-center justify-center mt-2 opacity-30">
                        <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-amber-900/50 to-transparent" />
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
                                            className={`flex p-4 ${theme.bg} border ${theme.border} rounded-lg hover:brightness-105 transition-all group relative overflow-hidden gap-4`}
                                        >
                                            {/* Left Side: Info */}
                                            <div className="flex-1 flex flex-col">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-10 h-10 flex items-center justify-center bg-white/50 rounded-lg border ${theme.border}`}>
                                                        {isItemSpriteIcon(item.icon)
                                                            ? <ItemIcon icon={item.icon as ItemIconKey} size="md" />
                                                            : <div className={`${item.icon} ${theme.text} text-xl`} />
                                                        }
                                                    </div>
                                                    <span className={`font-bold text-xl ${theme.text}`}>{item.title}</span>
                                                </div>

                                                <div className={`text-lg ${theme.text} opacity-80 pl-1 leading-snug font-crimson mt-2`}>
                                                    {item.description(lvl + 1)}
                                                </div>
                                            </div>

                                            {/* Right Side: Action & Level */}
                                            <div className="flex flex-col w-28 shrink-0 justify-between items-end gap-2">
                                                <span className={`text-3xl font-bold ${theme.text} opacity-90 block mt-1 tracking-tighter`}>{lvl}/{item.maxLevel}</span>

                                                <div className="w-full mt-auto">
                                                    {isMaxed ? (
                                                        <div className={`w-full py-2 text-sm font-bold ${theme.text} bg-${theme.primary}/10 rounded border ${theme.border} text-center uppercase tracking-widest`}>
                                                            Max
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => actions.onBuyUpgrade(item.id, cost)}
                                                            disabled={!canAfford}
                                                            className={`w-full py-2 text-base font-bold border rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md
                                                                ${canAfford
                                                                    ? 'bg-amber-400 border-amber-600 text-amber-900 hover:bg-amber-300 hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner'
                                                                    : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed grayscale'}
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
                            {renderTabButton('character', 15)}
                            {renderTabButton('upgrades', 30)}
                            {renderTabButton('settings', 45)}

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
                                ) : (
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
                        <div className="flex gap-3">
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
                </div>
            )}
        </AnimatePresence>
    );
});
