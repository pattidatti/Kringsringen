import React from 'react';
import { motion } from 'framer-motion';
import type { AchievementDef } from '../../config/achievements';

interface AchievementCardProps {
  achievement: AchievementDef;
  /** Is this achievement unlocked? */
  unlocked: boolean;
  /** Unlock timestamp (for showing date) */
  unlockedAt?: number;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  unlocked,
  unlockedAt,
}) => {
  const isSecret = achievement.secret && !unlocked;

  return (
    <motion.div
      className={`relative rounded-lg border-2 overflow-hidden transition-all ${
        unlocked
          ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-400 shadow-lg hover:shadow-xl'
          : 'bg-gradient-to-br from-slate-100 to-slate-200 border-slate-300 opacity-60'
      }`}
      whileHover={unlocked ? { scale: 1.02, y: -2 } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Secret achievement overlay */}
      {isSecret && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-2">🔒</div>
            <p className="text-slate-400 font-cinzel font-bold text-sm">HEMMELIG</p>
            <p className="text-slate-500 text-xs mt-1">???</p>
          </div>
        </div>
      )}

      {/* Card content */}
      <div className="p-4">
        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-4xl border-2 ${
            unlocked
              ? 'bg-amber-100 border-amber-400'
              : 'bg-slate-200 border-slate-300 grayscale'
          }`}
        >
          {!isSecret && achievement.icon}
        </div>

        {/* Title */}
        <h3
          className={`font-cinzel font-bold text-center mb-2 leading-tight ${
            unlocked ? 'text-amber-900' : 'text-slate-600'
          }`}
        >
          {!isSecret ? achievement.name : '???'}
        </h3>

        {/* Description */}
        <p
          className={`font-crimson text-sm text-center leading-snug mb-3 ${
            unlocked ? 'text-amber-800' : 'text-slate-500'
          }`}
        >
          {!isSecret ? achievement.description : 'Prestasjon skjult'}
        </p>

        {/* Unlock timestamp */}
        {unlocked && unlockedAt && (
          <div className="text-center pt-2 border-t border-amber-300">
            <p className="text-xs text-amber-700 font-crimson">
              Låst opp: {new Date(unlockedAt).toLocaleDateString('nb-NO')}
            </p>
          </div>
        )}

        {/* Locked state */}
        {!unlocked && !isSecret && (
          <div className="text-center pt-2 border-t border-slate-300">
            <div className="text-slate-400 text-xs">🔒 Låst</div>
          </div>
        )}
      </div>

      {/* Shine effect for unlocked achievements */}
      {unlocked && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          style={{
            animation: 'shine-card 3s ease-in-out infinite',
          }}
        />
      )}
    </motion.div>
  );
};

// Add shine animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes shine-card {
      0%, 100% { transform: translateX(-100%) skewX(-15deg); }
      50% { transform: translateX(100%) skewX(-15deg); }
    }
  `;
  if (!document.getElementById('achievement-card-styles')) {
    style.id = 'achievement-card-styles';
    document.head.appendChild(style);
  }
}
