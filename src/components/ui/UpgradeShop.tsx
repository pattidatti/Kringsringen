import React, { useState } from 'react';
import { MedievalPanel } from './MedievalPanel';
import { MedievalButton } from './MedievalButton';

export type UpgradeCategory = 'Karakter' | 'Sverd' | 'Bue' | 'Magi';

export interface ShopUpgrade {
    id: string;
    title: string;
    description: string;
    icon: string;
    basePrice: number;
    category: UpgradeCategory;
}

const UPGRADES: ShopUpgrade[] = [
    // KARAKTER
    { id: 'health', title: 'Vitalitet', description: '+20 Maks HP & Helbred 20', icon: 'm-icon-plus-small', basePrice: 20, category: 'Karakter' },
    { id: 'speed', title: 'Lynrask', description: '+15% Bevegelseshastighet', icon: 'm-icon-plus-small', basePrice: 25, category: 'Karakter' },

    // SVERD
    { id: 'damage', title: 'Skarpt Stål', description: '+20% Skade med sverd', icon: 'm-icon-sword', basePrice: 25, category: 'Sverd' },
    { id: 'knockback', title: 'Tungt Slag', description: '+25% Tilbakeslagseffekt', icon: 'm-icon-sword', basePrice: 20, category: 'Sverd' },

    // BUE
    { id: 'cooldown', title: 'Rask Trekking', description: '-15% Nedkjøling på bue', icon: 'm-icon-bow', basePrice: 30, category: 'Bue' },

    // MAGI (Upcoming)
    { id: 'magic_bolt', title: 'Ukjent Kraft', description: 'Du føler en magisk tilstedeværelse...', icon: 'm-icon-candle', basePrice: 999, category: 'Magi' },
];

interface UpgradeShopProps {
    coins: number;
    level: number;
    onApplyUpgrade: (upgradeId: string, cost: number) => void;
    onContinue: () => void;
}

export const UpgradeShop: React.FC<UpgradeShopProps> = ({ coins, level, onApplyUpgrade, onContinue }) => {
    const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<UpgradeCategory>('Karakter');

    const handleBuy = (upgrade: ShopUpgrade) => {
        const price = Math.floor(upgrade.basePrice * (1 + (level - 1) * 0.15));
        if (coins >= price && !purchasedIds.includes(upgrade.id)) {
            onApplyUpgrade(upgrade.id, price);
            setPurchasedIds([...purchasedIds, upgrade.id]);
        }
    };

    const categories: UpgradeCategory[] = ['Karakter', 'Sverd', 'Bue', 'Magi'];
    const filteredUpgrades = UPGRADES.filter(u => u.category === activeCategory);

    return (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-[#050507] medieval-pixel animate-in fade-in duration-700">
            <div className="m-vignette opacity-90" />
            <div className="absolute inset-0 m-hearth-light animate-pulse duration-[4000ms]" />

            <div className="relative flex flex-col items-center gap-8 max-w-7xl w-full p-6 lg:p-12 h-screen lg:h-auto overflow-y-auto no-scrollbar">

                {/* Header Section */}
                <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-12 duration-1000">
                    <h2 className="m-text-gold text-6xl lg:text-7xl tracking-tighter uppercase drop-shadow-[0_10px_40px_rgba(251,191,36,0.4)] m-text-shadow-strong">
                        Kjøpmannens Tavern
                    </h2>
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-amber-900/60" />
                        <p className="m-text-hud text-amber-200/60 text-xl lg:text-2xl italic tracking-wide">"Bytt dine mynter mot styrke, reisende."</p>
                        <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-amber-900/60" />
                    </div>
                </div>

                {/* Category Navigation */}
                <div className="flex flex-wrap justify-center gap-3 p-3 bg-slate-900/80 border border-white/5 backdrop-blur-md rounded-2xl animate-in fade-in zoom-in-95 duration-700 delay-200 shadow-2xl">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`relative px-8 py-3 rounded-xl m-text-hud text-base tracking-[0.2em] uppercase transition-all duration-500 overflow-hidden ${activeCategory === cat
                                    ? 'text-white m-text-glow-white bg-amber-600/30 border border-amber-400/30 translate-y-[-2px]'
                                    : 'text-white/20 hover:text-white/60 hover:bg-white/5'
                                }`}
                        >
                            <span className="relative z-10">{cat}</span>
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex flex-wrap justify-center gap-10 w-full animate-in slide-in-from-bottom-12 duration-1000 delay-300">
                    {filteredUpgrades.map((upgrade, idx) => {
                        const price = Math.floor(upgrade.basePrice * (1 + (level - 1) * 0.15));
                        const canAfford = coins >= price;
                        const isPurchased = purchasedIds.includes(upgrade.id);
                        const isMagic = upgrade.category === 'Magi';

                        return (
                            <div
                                key={upgrade.id}
                                style={{ animationDelay: `${idx * 100}ms` }}
                                className="group relative w-full sm:w-[340px]"
                            >
                                <MedievalPanel className={`relative p-8 flex flex-col transition-all duration-500 min-h-[420px] ${!canAfford && !isPurchased ? 'opacity-30 grayscale-[0.9]' : 'hover:translate-y-[-8px]'} ${isPurchased ? 'border-amber-400/40 ring-1 ring-amber-400/20' : ''} ${isMagic ? 'pointer-events-none' : ''}`}>

                                    <div className="flex flex-col items-center gap-6 flex-grow">
                                        {/* Icon Container with Radiant Background */}
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative w-24 h-24 flex items-center justify-center bg-black/80 border border-white/10 rounded-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] group-hover:bg-black transition-colors">
                                                <div className={`${upgrade.icon} m-scale-3 m-golden-glow group-hover:scale-[3.3] transition-transform duration-700 ease-out`} />
                                                {isPurchased && (
                                                    <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[1px] flex items-center justify-center">
                                                        <div className="m-icon-check-small m-scale-2 brightness-200 drop-shadow-lg" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-center w-full space-y-4">
                                            <h3 className="text-white text-3xl font-black tracking-tight m-text-shadow-strong uppercase group-hover:text-amber-400 transition-colors drop-shadow-md">{upgrade.title}</h3>
                                            <div className="m-card-inset-dark px-6 py-4 rounded-xl border border-white/5 flex items-center justify-center text-center">
                                                <p className="text-amber-50 font-bold text-xs leading-relaxed uppercase tracking-widest drop-shadow-sm">{upgrade.description}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer with Price Tag */}
                                    <div className="flex flex-col items-center gap-6 mt-6 pt-6 border-t border-white/5">
                                        <div className={`flex items-center gap-3 py-2 px-6 rounded-full bg-black/80 border ${canAfford ? 'border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : 'border-red-900/30 grayscale shadow-none'}`}>
                                            <div className={`m-icon-coin m-scale-2 ${canAfford ? 'brightness-125' : 'brightness-50 opacity-40'}`} />
                                            <span className={`text-2xl font-black italic tracking-tighter tabular-nums ${canAfford ? 'text-amber-400 m-text-glow-white !text-amber-400' : 'text-red-900 opacity-30'}`}>
                                                {isMagic ? '???' : price}
                                            </span>
                                        </div>

                                        <button
                                            disabled={!canAfford || isPurchased || isMagic}
                                            onClick={() => handleBuy(upgrade)}
                                            className={`relative w-full group/btn overflow-hidden transition-all duration-300 ${isPurchased ? 'cursor-default' : 'active:scale-95'}`}
                                        >
                                            <MedievalButton
                                                label={isPurchased ? "EID" : (isMagic ? "LÅST" : "KJØP OPPGRADERING")}
                                                onClick={() => { }}
                                                disabled={!canAfford || isPurchased || isMagic}
                                                variant="primary"
                                                className={`w-full scale-110 !h-14 ${isPurchased ? 'opacity-20 grayscale' : ''}`}
                                            />
                                        </button>
                                    </div>
                                </MedievalPanel>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Bar - Wealth and Exit */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 w-full max-w-6xl mt-12 pt-12 border-t border-white/5 animate-in slide-in-from-bottom-8 duration-1000 delay-500">

                    <div className="flex items-center gap-8 px-10 py-6 m-obsidian-glass shadow-[0_0_100px_rgba(0,0,0,0.8)] group hover:border-amber-500/40 transition-all duration-700">
                        <div className="flex flex-col">
                            <span className="m-text-stats text-[11px] text-amber-600 font-bold uppercase tracking-[0.4em] opacity-50">Dine Mynter</span>
                            <div className="flex items-center gap-4">
                                <span className="m-text-gold text-5xl font-black drop-shadow-[0_0_25px_rgba(251,191,36,0.6)]">{coins}</span>
                                <div className="m-icon-coin m-scale-4 m-golden-glow brightness-150" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <p className="m-text-stats text-[10px] text-amber-100/30 uppercase tracking-[0.3em] font-bold">Klar for neste utfordring?</p>
                        <button
                            onClick={onContinue}
                            className="group/cont relative"
                        >
                            <MedievalButton
                                label="FORTSETT REISEN"
                                onClick={() => { }}
                                className="scale-[1.8] hover:scale-[1.9] transition-transform duration-500 m-text-shadow-strong"
                            />
                            <div className="absolute -inset-8 bg-amber-500/10 blur-[60px] opacity-0 group-hover/cont:opacity-100 transition-opacity rounded-full pointer-events-none" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
