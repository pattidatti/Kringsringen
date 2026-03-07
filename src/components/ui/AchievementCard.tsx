import React from 'react';
import { motion } from 'framer-motion';
import type { AchievementDef } from '../../config/achievements';

interface AchievementCardProps {
  achievement: AchievementDef;
  /** Is this achievement unlocked? */
  unlocked: boolean;
  /** Unlock timestamp (for showing date) - currently unused but kept for future tooltip feature */
  unlockedAt?: number;
  /** Use compact horizontal layout (default: false) */
  compact?: boolean;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  unlocked,
  compact = false,
}) => {
  const isSecret = achievement.secret && !unlocked;

  // Compact horizontal layout
  if (compact) {
    return (
      <motion.div
        className={`relative flex items-center gap-3 p-2.5 rounded border transition-all ${
          unlocked
            ? 'bg-[#e3dac9]/40 border-amber-600/40 hover:border-amber-600/60'
            : 'bg-slate-200/40 border-slate-400/30 grayscale opacity-75'
        }`}
        whileHover={unlocked ? { scale: 1.01, x: 2 } : {}}
        transition={{ duration: 0.15 }}
      >
        {/* Icon (32×32) */}
        <div
          className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-2xl ${
            unlocked ? '' : 'opacity-50'
          }`}
        >
          {isSecret ? '🔒' : achievement.icon}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-cinzel font-bold text-base leading-tight ${
              unlocked ? 'text-amber-950' : 'text-slate-600'
            }`}
          >
            {!isSecret ? achievement.name : '???'}
          </h3>
          <p
            className={`font-crimson text-sm italic leading-snug mt-0.5 ${
              unlocked ? 'text-slate-700' : 'text-slate-500'
            }`}
          >
            {!isSecret ? achievement.description : 'Prestasjon skjult'}
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {unlocked ? (
            <span className="text-amber-600 text-lg">✓</span>
          ) : (
            <span className="text-slate-400 text-lg">○</span>
          )}
        </div>
      </motion.div>
    );
  }

  // Original large card layout (for backward compatibility)
  return (
    <motion.div
      className={`relative rounded-lg border overflow-hidden transition-all ${
        unlocked
          ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-400 shadow hover:shadow-md'
          : 'bg-gradient-to-br from-slate-100 to-slate-200 border-slate-300 opacity-70'
      }`}
      whileHover={unlocked ? { scale: 1.02, y: -2 } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Secret achievement overlay */}
      {isSecret && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-3">🔒</div>
            <p className="text-slate-300 font-cinzel font-bold text-base">HEMMELIG</p>
            <p className="text-slate-400 text-sm mt-1">???</p>
          </div>
        </div>
      )}

      {/* Card content */}
      <div className="p-5">
        {/* Icon */}
        <div
          className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-5xl border-2 ${
            unlocked
              ? 'bg-amber-100 border-amber-400'
              : 'bg-slate-200 border-slate-300 grayscale'
          }`}
        >
          {!isSecret && achievement.icon}
        </div>

        {/* Title */}
        <h3
          className={`font-cinzel font-bold text-center mb-3 leading-tight text-xl ${
            unlocked ? 'text-amber-950' : 'text-slate-700'
          }`}
        >
          {!isSecret ? achievement.name : '???'}
        </h3>

        {/* Description */}
        <p
          className={`font-crimson text-base text-center leading-relaxed ${
            unlocked ? 'text-slate-800' : 'text-slate-600'
          }`}
        >
          {!isSecret ? achievement.description : 'Prestasjon skjult'}
        </p>
      </div>
    </motion.div>
  );
}
