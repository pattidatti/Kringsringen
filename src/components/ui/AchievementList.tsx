import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ACHIEVEMENTS,
  getAllCategories,
  getCategoryDisplayName,
  type AchievementCategory,
} from '../../config/achievements';
import { AchievementCard } from './AchievementCard';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import { SaveManager } from '../../game/SaveManager';

interface AchievementListProps {
  /** Called when modal is closed */
  onClose: () => void;
}

export const AchievementList: React.FC<AchievementListProps> = ({ onClose }) => {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');
  const profile = SaveManager.getActiveProfile();

  const unlockedAchievements = useMemo(() => {
    return new Set(profile?.achievements || []);
  }, [profile]);

  const filteredAchievements = useMemo(() => {
    if (activeCategory === 'all') return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  const stats = useMemo(() => {
    const total = ACHIEVEMENTS.length;
    const unlocked = profile?.achievements.length || 0;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    return { total, unlocked, percentage };
  }, [profile]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleBackdropClick}
      >
        {/* Modal panel */}
        <motion.div
          className="relative z-10 w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <FantasyPanel
            variant="paper"
            contentPadding="p-6 flex flex-col h-full"
            className="w-full h-full flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-[2px] w-16 bg-gradient-to-r from-transparent via-amber-700/40 to-amber-900/80 rounded-full" />
                <h2
                  className="font-cinzel font-bold text-center text-3xl tracking-[0.15em] uppercase text-amber-900"
                  style={{ textShadow: '0 2px 4px rgba(120,53,15,0.2)' }}
                >
                  🏆 Prestasjoner
                </h2>
                <div className="h-[2px] w-16 bg-gradient-to-l from-transparent via-amber-700/40 to-amber-900/80 rounded-full" />
              </div>

              {/* Progress stats */}
              <div className="flex items-center gap-4 text-amber-800">
                <span className="font-cinzel font-bold text-lg">
                  {stats.unlocked} / {stats.total}
                </span>
                <div className="w-48 h-3 bg-amber-200 rounded-full overflow-hidden border border-amber-400">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <span className="font-crimson text-sm">{stats.percentage}%</span>
              </div>
            </div>

            {/* Category filters */}
            <div className="flex gap-2 mb-6 justify-center flex-wrap">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-lg font-cinzel font-bold text-sm uppercase tracking-wider transition-all ${
                  activeCategory === 'all'
                    ? 'bg-amber-600 text-white shadow-lg'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                Alle ({ACHIEVEMENTS.length})
              </button>
              {getAllCategories().map((category) => {
                const count = ACHIEVEMENTS.filter((a) => a.category === category).length;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-lg font-cinzel font-bold text-sm uppercase tracking-wider transition-all ${
                      activeCategory === category
                        ? 'bg-amber-600 text-white shadow-lg'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    }`}
                  >
                    {getCategoryDisplayName(category)} ({count})
                  </button>
                );
              })}
            </div>

            {/* Achievement grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAchievements.map((achievement) => {
                  const unlocked = unlockedAchievements.has(achievement.id);
                  return (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      unlocked={unlocked}
                      unlockedAt={unlocked ? Date.now() : undefined} // TODO: Track actual unlock timestamp
                    />
                  );
                })}
              </div>

              {/* Empty state */}
              {filteredAchievements.length === 0 && (
                <div className="text-center py-12 text-amber-700">
                  <p className="font-cinzel font-bold text-lg">Ingen prestasjoner i denne kategorien</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-center">
              <FantasyButton
                label="Lukk"
                variant="secondary"
                onClick={onClose}
                className="w-48 !text-black [text-shadow:none]"
              />
            </div>
          </FantasyPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
