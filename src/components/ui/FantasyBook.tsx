import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import { PerkCard } from './PerkCard';
import bookOpen from '../../assets/ui/fantasy/containers/book_open.png';
// Using existing tabs for new purposes:
// Red = Status
// Yellow = Grimoire (Level Up)
// Green = Merchant (Shop)
// Blue = Bestiary (Compendium - Future)
import tabRed from '../../assets/ui/fantasy/tabs/red.png';
import tabYellow from '../../assets/ui/fantasy/tabs/yellow.png';
import tabGreen from '../../assets/ui/fantasy/tabs/green.png';
import { UPGRADES, type UpgradeConfig } from '../../config/upgrades';
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

type TabKey = 'status' | 'grimoire' | 'merchant';

// Map logical tabs to visual assets
// const TAB_ASSETS: Record<TabKey, FantasyTabVariant> = {
//     status: 'red',
//     grimoire: 'yellow',
//     merchant: 'green'
// };

const TABS: Record<TabKey, { title: string; icon: string; color: string; locked?: boolean }> = {
    status: { title: 'Status', icon: tabRed, color: 'text-red-900' },
    grimoire: { title: 'Grimoire', icon: tabYellow, color: 'text-amber-900' },
    merchant: { title: 'Merchant', icon: tabGreen, color: 'text-emerald-900' },
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
    availablePerks = [],
    actions
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('status');
    const [activeShopCategory, setActiveShopCategory] = useState<UpgradeConfig['category']>('Sverd');

    // Subscribe to Registry for Real-Time Updates
    const level = useGameRegistry('playerLevel', 1);
    const coins = useGameRegistry('playerCoins', 0);
    const upgradeLevels = useGameRegistry<Record<string, number>>('upgradeLevels', {});

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
            if (mode === 'level_up') setActiveTab('grimoire');
            else if (mode === 'shop') setActiveTab('merchant');
            else setActiveTab('status');
        }
    }, [isOpen, mode]);

    const renderTabButton = (key: TabKey, topOffset: number) => {
        const config = TABS[key];
        const isActive = activeTab === key;

        return (
            <button
                onClick={() => setActiveTab(key)}
                className={`absolute right-[-28px] w-[34px] h-[18px] flex items-center justify-center transition-transform ${isActive ? 'translate-x-[-2px]' : 'hover:translate-x-[-1px]'}`}
                style={{
                    top: `${topOffset}%`,
                    backgroundImage: `url(${config.icon})`,
                    imageRendering: 'pixelated',
                    zIndex: isActive ? 10 : 0
                }}
                title={config.title}
            />
        );
    };

    const renderStatusPage = () => (
        <div className="space-y-4 font-serif text-slate-800 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-4 border-b border-red-900/20 pb-2">
                <div className="w-16 h-16 bg-slate-200 border-2 border-slate-400 rounded-full flex items-center justify-center overflow-hidden">
                    {/* Placeholder Portrait */}
                    <span className="text-2xl">👤</span>
                </div>
                <div>
                    <h3 className="text-xl font-bold font-medieval text-red-900">Hero Level {level}</h3>
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



    // --- GRIMOIRE (LEVEL UP) LEFT PAGE: Hero's Growth ---
    const renderGrimoireLeftPage = () => {
        if (mode !== 'level_up') {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60 animate-in fade-in duration-500">
                    <div className="text-4xl mb-4 text-amber-900">🔒</div>
                    <p className="font-medieval text-xl text-amber-900">The pages are blank...</p>
                    <p className="text-sm italic mt-2">Gain experience to reveal new powers.</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full items-center justify-center text-center animate-in fade-in duration-500 bg-amber-50/30 rounded-lg border border-amber-900/5 p-4 mx-2 my-4">
                <div className="mb-2">
                    <span className="text-6xl">✨</span>
                </div>

                <h2 className="font-medieval text-4xl text-amber-900 mb-1">Level {level}</h2>
                <div className="w-16 h-1 bg-amber-900/20 rounded-full mb-4 mx-auto" />

                <p className="font-serif italic text-amber-800/80 text-lg mb-6 leading-relaxed">
                    "The cosmos aligns. <br />A new power awakens within you."
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs text-amber-900/60 w-full max-w-[200px] text-left opacity-70">
                    <div>HP: {Math.round(maxHp)}</div>
                    <div>DMG: {Math.round(damage)}</div>
                    <div>SPD: {speed}</div>
                    <div>DEF: {armor}</div>
                </div>
            </div>
        );
    };

    // --- GRIMOIRE (LEVEL UP) RIGHT PAGE: The Choice ---
    const renderGrimoireRightPage = () => {
        if (mode !== 'level_up') {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 opacity-40">
                    <p className="font-medieval text-lg text-amber-900/50">Awaiting destiny...</p>
                </div>
            );
        }

        if (availablePerks.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="font-medieval text-2xl text-amber-900">Mastery Achieved</h3>
                    <p className="italic text-amber-800/70 mt-2">You have learned all there is to know.</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full justify-center">
                <h3 className="font-medieval text-xl text-center text-amber-900 mb-4 opacity-80 border-b border-amber-900/10 pb-2">
                    Choose Your Path
                </h3>
                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 -mr-1 pb-2">
                    {availablePerks.map((perk, index) => {
                        const currentLvl = (upgradeLevels[perk.id] || 0) + 1;
                        return (
                            <PerkCard
                                key={perk.id}
                                perk={perk}
                                level={currentLvl}
                                onClick={() => actions.onSelectPerk(perk.id)}
                                index={index}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    // Keeping original function for reference/deletion but effectively replacing usage below
    // const renderGrimoirePage = ... (Deleted)

    // --- MERCHANT LEFTS PAGE: Categories ---
    const renderMerchantCategories = () => {
        const categories: { key: UpgradeConfig['category']; label: string; icon: string }[] = [
            { key: 'Sverd', label: 'Sverd', icon: 'm-icon-sword' },
            { key: 'Bue', label: 'Bue', icon: 'm-icon-bow' },
            { key: 'Karakter', label: 'Karakter', icon: 'm-icon-plus-small' }, // Using plus as general character/vitality icon
            { key: 'Magi', label: 'Magi', icon: 'm-icon-candle' },
        ];

        return (
            <div className="flex flex-col h-full font-serif animate-in fade-in duration-300">
                <div className="mb-6 text-center border-b border-emerald-900/20 pb-4">
                    <div className="text-xs uppercase tracking-widest text-emerald-800/60 mb-1">Merchant's Purse</div>
                    <div className="flex items-center justify-center gap-2 font-bold text-emerald-900 bg-emerald-50/50 py-2 rounded border border-emerald-900/10">
                        <span className="text-xl">{coins}</span>
                        <div className="w-4 h-4 rounded-full bg-amber-400 border border-amber-600 shadow-sm" />
                    </div>
                </div>

                <div className="space-y-3 flex-1 px-1">
                    {categories.map((cat) => (
                        <button
                            key={cat.key}
                            onClick={() => setActiveShopCategory(cat.key)}
                            className={`w-full flex items-center gap-4 p-3 rounded border transition-all duration-200 group relative overflow-hidden
                                ${activeShopCategory === cat.key
                                    ? 'bg-emerald-100 border-emerald-600 shadow-inner'
                                    : 'bg-transparent border-transparent hover:bg-emerald-50/50 hover:border-emerald-200/50 hover:translate-x-1'
                                }
                            `}
                        >
                            <div className={`w-8 h-8 flex items-center justify-center rounded border transition-colors
                                ${activeShopCategory === cat.key
                                    ? 'bg-emerald-200 border-emerald-500 text-emerald-900'
                                    : 'bg-slate-100 border-slate-300 text-slate-400 group-hover:border-emerald-300 group-hover:text-emerald-700'
                                }
                            `}>
                                <span className={`${cat.icon} text-lg`} />
                            </div>
                            <span className={`font-medieval text-lg ${activeShopCategory === cat.key ? 'text-emerald-900 font-bold' : 'text-slate-600 group-hover:text-emerald-800'}`}>
                                {cat.label}
                            </span>
                            {activeShopCategory === cat.key && (
                                <motion.div
                                    layoutId="active-indicator"
                                    className="ml-auto w-2 h-2 rounded-full bg-emerald-600"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // --- MERCHANT RIGHT PAGE: Items ---
    const renderMerchantItems = () => {
        const shopItems = UPGRADES.filter(u => u.category === activeShopCategory);

        return (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-emerald-900/20">
                    <span className="font-medieval text-emerald-900 text-lg">{activeShopCategory} Wares</span>
                    <span className="text-xs text-emerald-800/50 italic">{shopItems.length} items</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {shopItems.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center h-48 text-center text-emerald-800/40"
                            >
                                <span className="text-4xl mb-2 opacity-50">🕸️</span>
                                <p className="italic text-sm">Nothing to see here yet...</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                className="grid grid-cols-1 gap-2 pb-2"
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
                                            className="flex flex-col p-3 bg-emerald-50/30 border border-emerald-900/10 rounded hover:bg-emerald-50 hover:border-emerald-900/30 transition-all group"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 flex items-center justify-center bg-white rounded border border-emerald-900/10 group-hover:border-emerald-500/30 transition-colors`}>
                                                        <div className={`${item.icon} text-emerald-800 text-sm`} />
                                                    </div>
                                                    <span className="font-bold text-base text-emerald-900">{item.title}</span>
                                                </div>
                                                <span className="text-xs font-bold text-emerald-700/60 bg-emerald-100/50 px-2 py-0.5 rounded">Lvl {lvl}/{item.maxLevel}</span>
                                            </div>

                                            <div className="text-xs text-emerald-800/80 mb-3 pl-11 leading-snug">
                                                {item.description(lvl + 1)}
                                            </div>

                                            <div className="flex justify-end pl-11">
                                                {isMaxed ? (
                                                    <span className="text-xs font-bold text-emerald-600 px-3 py-1 bg-emerald-100 rounded border border-emerald-200 w-full text-center">MAXED</span>
                                                ) : (
                                                    <button
                                                        onClick={() => actions.onBuyUpgrade(item.id, cost)}
                                                        disabled={!canAfford}
                                                        className={`w-full py-1.5 text-xs font-bold border rounded transition-all flex items-center justify-center gap-2 shadow-sm
                                                            ${canAfford
                                                                ? 'bg-amber-400 border-amber-600 text-amber-900 hover:bg-amber-300 hover:-translate-y-0.5 active:translate-y-0'
                                                                : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed opacity-70'}
                                                        `}
                                                    >
                                                        <span>Buy for {cost}</span>
                                                        <div className="w-2 h-2 rounded-full bg-current opacity-80" />
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
                        {renderTabButton('status', 15)}
                        {renderTabButton('grimoire', 25)}
                        {renderTabButton('merchant', 35)}

                        {/* Content Layer */}
                        <div className="absolute inset-0 grid grid-cols-2 p-[6%] gap-[4%] pt-[8%] pb-[8%] font-serif text-slate-900 overflow-hidden">
                            {/* Left Page: Main Content Area */}
                            <div className="px-5 py-3 overflow-y-auto custom-scrollbar h-full pr-4 relative overflow-x-hidden">
                                {/* Title only for non-merchant pages, as merchant has custom layout */}
                                {activeTab !== 'merchant' && (
                                    <h2 className={`text-2xl font-bold mb-4 font-medieval border-b-2 pb-2 ${TABS[activeTab].color} border-current opacity-80 sticky top-0 bg-[#e3dac9] z-10`}>
                                        {TABS[activeTab].title}
                                    </h2>
                                )}

                                {activeTab === 'status' && renderStatusPage()}
                                {activeTab === 'grimoire' && renderGrimoireLeftPage()}
                                {activeTab === 'merchant' && renderMerchantCategories()}
                            </div>

                            {/* Right Page: Supplemental / Notes / Controls / Merchant Items */}
                            <div className="px-5 py-3 h-full flex flex-col justify-between relative overflow-x-hidden">
                                {activeTab === 'merchant' && renderMerchantItems()}
                                {activeTab === 'grimoire' && renderGrimoireRightPage()}

                                {activeTab === 'status' && (
                                    <>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-bold text-amber-900/70 font-medieval border-b border-amber-900/10 pb-1">Notes</h3>
                                            <div className="text-sm italic text-slate-600 font-handwriting leading-relaxed opacity-80">
                                                {mode === 'level_up' && "Great power flows through you. Choose wisely, for the path shapes the walker."}
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
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});
