import React from 'react';
import { MedievalPanel } from './MedievalPanel';
import { MedievalButton } from './MedievalButton';

interface StatsPanelProps {
    stats: {
        damage: number;
        attackSpeed: number;
        speed: number;
        armor: number;
        regen: number;
        critChance: number;
        projectiles: number;
        luck: number;
        maxHp: number;
    };
    isOpen: boolean;
    onClose: () => void;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <MedievalPanel className="relative w-full max-w-md p-6 m-obsidian-glass shadow-2xl border border-amber-500/20">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 className="m-text-gold text-2xl font-bold uppercase tracking-wider">Karakter Statistikk</h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <div className="m-btn m-btn-cross m-scale-2" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Offense Section */}
                    <div className="space-y-2">
                        <h3 className="m-text-stats text-amber-500/80 uppercase text-xs tracking-[0.2em] border-b border-amber-500/10 pb-1">Angrep</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <StatRow label="Skade" value={stats.damage} icon="m-icon-sword" />
                            <StatRow label="Angrepsfart" value={`${(stats.attackSpeed * 100).toFixed(0)}%`} icon="m-icon-sword" />
                            <StatRow label="Kritisk Sjanse" value={`${(stats.critChance * 100).toFixed(0)}%`} icon="m-icon-sword" />
                            <StatRow label="Prosjektiler" value={stats.projectiles} icon="m-icon-bow" />
                        </div>
                    </div>

                    {/* Defense Section */}
                    <div className="space-y-2">
                        <h3 className="m-text-stats text-blue-400/80 uppercase text-xs tracking-[0.2em] border-b border-blue-400/10 pb-1">Forsvar</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <StatRow label="Maks Liv" value={stats.maxHp} icon="m-icon-plus-small" />
                            <StatRow label="Rustning" value={stats.armor} icon="m-icon-plus-small" />
                            <StatRow label="Regenerering" value={`${stats.regen}/s`} icon="m-icon-plus-small" />
                        </div>
                    </div>

                    {/* Utility Section */}
                    <div className="space-y-2">
                        <h3 className="m-text-stats text-emerald-400/80 uppercase text-xs tracking-[0.2em] border-b border-emerald-400/10 pb-1">Annet</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <StatRow label="Hastighet" value={stats.speed} icon="m-icon-plus-small" />
                            <StatRow label="Flaks" value={`${(stats.luck * 100).toFixed(0)}%`} icon="m-icon-coin" />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <MedievalButton label="LUKK (C)" onClick={onClose} variant="primary" className="w-full" />
                </div>
            </MedievalPanel>
        </div>
    );
};

const StatRow = ({ label, value, icon }: { label: string, value: string | number, icon: string }) => (
    <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-2">
            <div className={`${icon} opacity-70 scale-75`} />
            <span className="text-stone-300 text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-amber-100 font-bold tabular-nums text-sm">{value}</span>
    </div>
);
