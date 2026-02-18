import React, { useState } from 'react';
import { MedievalPanel } from './MedievalPanel';
import { MedievalButton } from './MedievalButton';

export interface ShopUpgrade {
    id: string;
    title: string;
    description: string;
    icon: string;
    basePrice: number;
}

const UPGRADES: ShopUpgrade[] = [
    { id: 'damage', title: 'Skarpet Stål', description: '+20% Skade', icon: 'm-icon-sword', basePrice: 50 },
    { id: 'speed', title: 'Lette Støvler', description: '+15% Hastighet', icon: 'm-icon-plus-small', basePrice: 40 },
    { id: 'health', title: 'Forsterket Brynje', description: '+20 Maks HP', icon: 'm-icon-plus-small', basePrice: 60 },
    { id: 'cooldown', title: 'Raske Reflekser', description: '-15% Nedkjøling', icon: 'm-icon-plus-small', basePrice: 70 },
    { id: 'knockback', title: 'Tungt Skjold', description: '+25% Tilbakeslag', icon: 'm-icon-sword', basePrice: 45 }
];

interface UpgradeShopProps {
    coins: number;
    level: number;
    onApplyUpgrade: (upgradeId: string, cost: number) => void;
    onContinue: () => void;
}

export const UpgradeShop: React.FC<UpgradeShopProps> = ({ coins, level, onApplyUpgrade, onContinue }) => {
    const [purchasedIds, setPurchasedIds] = useState<string[]>([]);

    const handleBuy = (upgrade: ShopUpgrade) => {
        const price = Math.floor(upgrade.basePrice * (1 + (level - 1) * 0.2));
        if (coins >= price) {
            onApplyUpgrade(upgrade.id, price);
            setPurchasedIds([...purchasedIds, upgrade.id]);
        }
    };

    return (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-950/90 backdrop-blur-md medieval-pixel animate-in fade-in duration-500">
            <div className="m-vignette" />

            <div className="relative flex flex-col items-center gap-12 max-w-5xl w-full p-8">
                <div className="text-center space-y-4">
                    <h2 className="m-text-gold text-7xl tracking-tighter uppercase drop-shadow-2xl">Kjøpmannens Tavern</h2>
                    <p className="m-text-hud text-amber-200/60 text-2xl italic">"Velkommen kriger. Bruk dine mynter visst."</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    {UPGRADES.map((upgrade) => {
                        const price = Math.floor(upgrade.basePrice * (1 + (level - 1) * 0.2));
                        const canAfford = coins >= price;
                        const isPurchased = purchasedIds.includes(upgrade.id);

                        return (
                            <div key={upgrade.id} className="relative group">
                                <MedievalPanel className={`p-6 flex flex-col items-center gap-4 transition-all duration-300 ${!canAfford && !isPurchased ? 'opacity-60 grayscale' : 'hover:scale-105'} ${isPurchased ? 'border-green-500/50' : ''}`}>
                                    <div className="relative w-16 h-16 flex items-center justify-center bg-slate-900/50 rounded-lg border border-amber-900/20">
                                        <div className={`${upgrade.icon} m-scale-2`} />
                                    </div>

                                    <div className="text-center">
                                        <h3 className="m-text-hud text-xl text-amber-100 uppercase">{upgrade.title}</h3>
                                        <p className="m-text-stats text-xs text-amber-50/40 mt-1">{upgrade.description}</p>
                                    </div>

                                    <div className="mt-2 flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="m-icon-plus-small scale-75 brightness-200" />
                                            <span className={`m-text-stats font-bold ${canAfford ? 'text-amber-400' : 'text-red-500'}`}>
                                                {price} Mounter
                                            </span>
                                        </div>

                                        <MedievalButton
                                            label={isPurchased ? "Kjøpt" : "Kjøp"}
                                            onClick={() => handleBuy(upgrade)}
                                            disabled={!canAfford || isPurchased}
                                            variant={isPurchased ? "primary" : (canAfford ? "primary" : "primary")} // Adjust variants if needed
                                            className={`scale-90 ${isPurchased ? 'opacity-50 grayscale' : ''}`}
                                        />
                                    </div>
                                </MedievalPanel>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col items-center gap-6 mt-8">
                    <div className="flex items-center gap-4 bg-slate-900/80 px-8 py-4 rounded-full border border-amber-900/30">
                        <span className="m-text-hud text-amber-600 tracking-widest text-sm uppercase">Total Rikdom:</span>
                        <div className="flex items-center gap-2">
                            <span className="m-text-gold text-3xl font-black">{coins}</span>
                            <div className="m-icon-candle scale-75 brightness-150" />
                        </div>
                    </div>

                    <MedievalButton
                        label="Gå Videre til Neste Nivå"
                        onClick={onContinue}
                        className="scale-125"
                    />
                </div>
            </div>
        </div>
    );
};
