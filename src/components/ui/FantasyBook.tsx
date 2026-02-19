import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FantasyButton } from './FantasyButton';
import bookOpen from '../../assets/ui/fantasy/panels/book_open.png';
// Using existing tabs for new purposes:
// Red = Status
// Yellow = Grimoire (Level Up)
// Green = Merchant (Shop)
// Blue = Bestiary (Compendium - Future)
import tabRed from '../../assets/ui/fantasy/panels/tab_red.png';
import tabYellow from '../../assets/ui/fantasy/panels/tab_yellow.png';
import tabGreen from '../../assets/ui/fantasy/panels/tab_green.png';
import { UPGRADES, type UpgradeConfig } from '../../config/upgrades';
import { useGameRegistry } from '../../hooks/useGameRegistry';

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
        <div className="space-y-4 font-serif text-slate-800">
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

    const renderGrimoirePage = () => {
        if (mode !== 'level_up') {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                    <div className="text-4xl mb-4 text-amber-900">🔒</div>
                    <p className="font-medieval text-xl text-amber-900">The pages are blank...</p>
                    <p className="text-sm italic mt-2">Gain experience to reveal new powers.</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full">
                <p className="text-center italic text-amber-800/60 mb-4 text-sm">Choose your destiny...</p>
                <div className="flex flex-col gap-2">
                    {availablePerks.map((perk) => {
                        const currentLvl = (upgradeLevels[perk.id] || 0) + 1;
                        return (
                            <button
                                key={perk.id}
                                onClick={() => actions.onSelectPerk(perk.id)}
                                className="group relative flex items-center gap-3 p-2 bg-amber-50 border border-amber-900/20 hover:bg-amber-100 hover:border-amber-600 hover:-translate-y-0.5 transition-all rounded text-left w-full shadow-sm"
                            >
                                <div className="p-1.5 bg-amber-200/50 rounded border border-amber-900/10 group-hover:bg-amber-300 shrink-0">
                                    <div className={`${perk.icon} text-amber-900 text-lg`} />
                                </div>
                                <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-amber-900 font-medieval truncate text-sm">{perk.title} <span className="text-[10px] opacity-60 font-sans">Lvl {currentLvl}</span></h4>
                                        <p className="text-[10px] text-amber-800 leading-tight mt-0.5 truncate opacity-80">{perk.description(currentLvl)}</p>
                                    </div>
                                    <div className="text-[10px] font-bold text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        SELECT
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderMerchantPage = () => {
        // Filter out "Magi" category for now as per config
        const shopItems = UPGRADES.filter(u => u.category !== 'Magi');

        return (
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-emerald-900/20 sticky top-10 bg-[#e3dac9] z-10">
                    <span className="font-medieval text-emerald-900 text-lg">Wares</span>
                    <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 shadow-sm">
                        <span>{coins}</span>
                        <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pb-10">
                    {shopItems.map(item => {
                        const lvl = upgradeLevels[item.id] || 0;
                        const cost = Math.floor(item.basePrice * Math.pow(item.priceScale, lvl));
                        const canAfford = coins >= cost;
                        const isMaxed = lvl >= item.maxLevel;

                        return (
                            <div key={item.id} className="flex items-center justify-between p-2 bg-emerald-50/50 border border-emerald-900/10 rounded hover:bg-emerald-100/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 flex items-center justify-center bg-white rounded border border-emerald-900/20 shrink-0`}>
                                        <div className={item.icon} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm text-emerald-900 truncate">{item.title} <span className="text-[10px] opacity-60 ml-1">Lvl {lvl}</span></div>
                                        <div className="text-[10px] text-emerald-800/60 truncate">{item.description(lvl + 1)}</div>
                                    </div>
                                </div>

                                <div className="shrink-0 ml-2">
                                    {isMaxed ? (
                                        <span className="text-xs font-bold text-emerald-600 px-2 py-1 bg-emerald-100 rounded">MAX</span>
                                    ) : (
                                        <button
                                            onClick={() => actions.onBuyUpgrade(item.id, cost)}
                                            disabled={!canAfford}
                                            className={`px-3 py-1 text-xs font-bold border rounded transition-all flex items-center gap-1 shadow-sm
                                                ${canAfford
                                                    ? 'bg-amber-400 border-amber-600 text-amber-900 hover:bg-amber-300 active:translate-y-0.5'
                                                    : 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'}
                                            `}
                                        >
                                            {cost} <div className="w-2 h-2 rounded-full bg-current opacity-80" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
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
                            className="absolute inset-0 w-full h-full object-contain image-rendering-pixelated"
                        />

                        {/* Tabs */}
                        {renderTabButton('status', 15)}
                        {renderTabButton('grimoire', 25)}
                        {renderTabButton('merchant', 35)}

                        {/* Content Layer */}
                        <div className="absolute inset-0 grid grid-cols-2 p-[6%] gap-[4%] pt-[8%] pb-[8%] font-serif text-slate-900 overflow-hidden">
                            {/* Left Page: Main Content Area */}
                            <div className="px-5 py-3 overflow-y-auto custom-scrollbar h-full pr-4">
                                <h2 className={`text-2xl font-bold mb-4 font-medieval border-b-2 pb-2 ${TABS[activeTab].color} border-current opacity-80 sticky top-0 bg-[#e3dac9] z-10`}>
                                    {TABS[activeTab].title}
                                </h2>

                                {activeTab === 'status' && renderStatusPage()}
                                {activeTab === 'grimoire' && renderGrimoirePage()}
                                {activeTab === 'merchant' && renderMerchantPage()}
                            </div>

                            {/* Right Page: Supplemental / Notes / Controls */}
                            <div className="px-5 py-3 h-full flex flex-col justify-between">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-amber-900/70 font-medieval border-b border-amber-900/10 pb-1">Notes</h3>
                                    <div className="text-sm italic text-slate-600 font-handwriting leading-relaxed opacity-80">
                                        {mode === 'level_up' && "Great power flows through you. Choose wisely, for the path shapes the walker."}
                                        {mode === 'shop' && "Ah, a customer! Standard exchange rates apply. No refunds on cursed items."}
                                        {mode === 'view' && "\"To defeat the darkness, one must first understand their own strength.\""}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-amber-900/10">
                                    {(mode === 'view' || mode === 'shop') && (
                                        <FantasyButton
                                            variant="danger"
                                            onClick={onClose}
                                            className="scale-90 origin-bottom-right"
                                            label="Close Book"
                                        />
                                    )}
                                    {mode === 'level_up' && (
                                        <div className="text-xs text-amber-800 animate-pulse">
                                            Select an upgrade to continue...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});
