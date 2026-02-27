import React from 'react';
import { motion } from 'framer-motion';
import { type UpgradeConfig, isItemSpriteIcon } from '../../config/upgrades';
import { ItemIcon, type ItemIconKey } from './ItemIcon';

interface PerkCardProps {
    perk: UpgradeConfig;
    level: number;
    onClick: () => void;
    index: number;
}

const CATEGORY_STYLES: Record<string, { bg: string; border: string; iconBg: string; text: string; iconColor: string }> = {
    'Sverd': {
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        iconBg: 'bg-slate-200',
        text: 'text-slate-800',
        iconColor: 'text-slate-900',
    },
    'Bue': {
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        iconBg: 'bg-emerald-200',
        text: 'text-emerald-800',
        iconColor: 'text-emerald-900',
    },
    'Karakter': {
        bg: 'bg-red-50',
        border: 'border-red-300',
        iconBg: 'bg-red-200',
        text: 'text-red-900',
        iconColor: 'text-red-900',
    },
    'Magi': {
        bg: 'bg-purple-50',
        border: 'border-purple-300',
        iconBg: 'bg-purple-200',
        text: 'text-purple-900',
        iconColor: 'text-purple-900',
    },
};

const DEFAULT_STYLE = {
    bg: 'bg-amber-50',
    border: 'border-amber-900/20',
    iconBg: 'bg-amber-200',
    text: 'text-amber-900',
    iconColor: 'text-amber-900',
};

export const PerkCard: React.FC<PerkCardProps> = ({ perk, level, onClick, index }) => {
    const styles = CATEGORY_STYLES[perk.category] || DEFAULT_STYLE;

    return (
        <motion.button
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={onClick}
            className={`group relative flex items-start gap-4 p-4 w-full rounded-lg border-2 text-left shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 ${styles.bg} ${styles.border}`}
        >
            {/* Icon Container */}
            <div className={`p-3 rounded-md shrink-0 border border-black/10 shadow-inner ${styles.iconBg}`}>
                {isItemSpriteIcon(perk.icon)
                    ? <ItemIcon
                        icon={perk.icon as ItemIconKey}
                        size="md"
                        style={perk.iconTint ? { filter: perk.iconTint } : {}}
                    />
                    : <div
                        className={`${perk.icon} ${styles.iconColor} text-2xl`}
                        style={perk.iconTint ? { filter: perk.iconTint } : {}}
                    />
                }
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-cinzel font-bold text-lg leading-none ${styles.text}`}>
                        {perk.title}
                    </h4>
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 border border-current px-1 rounded">
                        {perk.category}
                    </span>
                </div>

                <p className={`text-sm opacity-80 mb-2 leading-snug font-crimson ${styles.text}`}>
                    {perk.description(level)}
                </p>

                <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold opacity-60 ${styles.text}`}>
                        Level {level}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded bg-white/50 border border-current opacity-0 group-hover:opacity-100 transition-opacity ${styles.text}`}>
                        SELECT
                    </span>
                </div>
            </div>
        </motion.button>
    );
};
