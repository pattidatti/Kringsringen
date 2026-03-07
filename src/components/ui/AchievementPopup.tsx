import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AchievementDef } from '../../config/achievements';
import { AudioManager } from '../../game/AudioManager';

interface AchievementPopupProps {
  /** Achievement to display (null = hidden) */
  achievement: AchievementDef | null;
  /** Called when toast is dismissed */
  onDismiss: () => void;
  /** Auto-dismiss duration in ms (default: 4000) */
  duration?: number;
}

export const AchievementPopup: React.FC<AchievementPopupProps> = ({
  achievement,
  onDismiss,
  duration = 4000,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!achievement) {
      setProgress(100);
      return;
    }

    // Play achievement unlock sound
    AudioManager.instance.playSFX('achievement_unlock', { volume: 0.6 });

    // Auto-dismiss timer
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, duration);

    // Progress bar animation
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(progressInterval);
      }
    }, 16); // ~60fps

    return () => {
      clearTimeout(dismissTimer);
      clearInterval(progressInterval);
    };
  }, [achievement, duration, onDismiss]);

  if (!achievement) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-28 left-1/2 -translate-x-1/2 z-[50] max-w-sm mx-4"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={onDismiss}
      >
        {/* Toast card */}
        <div
          className="relative bg-gradient-to-br from-amber-900 to-amber-950 text-amber-50 rounded-lg shadow-2xl border-2 border-amber-600 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
          style={{
            boxShadow: '0 10px 40px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Shine effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{
              animation: 'shine 2s ease-in-out infinite',
            }}
          />

          {/* Content */}
          <div className="relative p-4 flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-16 h-16 bg-amber-800/50 rounded-full flex items-center justify-center text-4xl border-2 border-amber-600/50">
              {achievement.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-400 text-sm font-cinzel font-bold uppercase tracking-wider">
                  🏆 Prestasjon låst opp!
                </span>
              </div>
              <h3 className="font-cinzel font-bold text-lg text-amber-50 mb-1 leading-tight">
                {achievement.name}
              </h3>
              <p className="font-crimson text-sm text-amber-200/90 leading-snug">
                {achievement.description}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-amber-950/50">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300"
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * AchievementToastQueue: Manages multiple achievement toasts
 * (Shows one at a time, queues additional unlocks)
 */
interface QueuedAchievement {
  achievement: AchievementDef;
  id: string;
}

interface AchievementToastQueueProps {
  /** Array of achievements to display (managed externally) */
  queue: QueuedAchievement[];
  /** Called when an achievement is dismissed */
  onDismiss: (id: string) => void;
}

export const AchievementToastQueue: React.FC<AchievementToastQueueProps> = ({
  queue,
  onDismiss,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex >= queue.length) {
      setCurrentIndex(0);
    }
  }, [queue, currentIndex]);

  const currentAchievement = queue[currentIndex] || null;

  const handleDismiss = () => {
    if (currentAchievement) {
      onDismiss(currentAchievement.id);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <AchievementPopup
      achievement={currentAchievement?.achievement || null}
      onDismiss={handleDismiss}
      duration={4000}
    />
  );
};

// Add keyframe animation to global styles (Tailwind doesn't have this by default)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes shine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;
  document.head.appendChild(style);
}
