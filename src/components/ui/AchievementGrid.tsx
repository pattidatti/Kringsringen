import React, { useState, useMemo } from 'react';
import {
  ACHIEVEMENTS,
  getAllCategories,
  getCategoryDisplayName,
  type AchievementCategory,
} from '../../config/achievements';
import { AchievementCard } from './AchievementCard';
import { FantasyButton } from './FantasyButton';
import { SaveManager } from '../../game/SaveManager';

interface AchievementGridProps {
  /** Show category filters at the top */
  showFilters?: boolean;
  /** Show stats header (X/Y unlocked) */
  showStats?: boolean;
  /** Additional className for the grid container */
  className?: string;
}

/**
 * Pure achievement grid component - can be embedded or used standalone.
 * Handles category filtering and displays achievement cards in a responsive grid.
 */
export const AchievementGrid: React.FC<AchievementGridProps> = ({
  showFilters = true,
  showStats = true,
  className = '',
}) => {
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

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Stats header */}
      {showStats && (
        <div className="flex flex-col items-center mb-4">
          <div className="font-cinzel font-bold text-2xl text-amber-950">
            {stats.unlocked} / {stats.total}
          </div>
        </div>
      )}

      {/* Category filters - Fantasy style */}
      {showFilters && (
        <div className="flex gap-2 mb-4 justify-center flex-wrap">
          <FantasyButton
            variant={activeCategory === 'all' ? 'primary' : 'secondary'}
            onClick={() => setActiveCategory('all')}
            label="Alle"
            className="!text-xs !py-1 !px-3"
          />
          {getAllCategories().map((category) => {
            return (
              <FantasyButton
                key={category}
                variant={activeCategory === category ? 'primary' : 'secondary'}
                onClick={() => setActiveCategory(category)}
                label={getCategoryDisplayName(category)}
                className="!text-xs !py-1 !px-3"
              />
            );
          })}
        </div>
      )}

      {/* Achievement grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="grid grid-cols-1 gap-2">
          {filteredAchievements.map((achievement) => {
            const unlocked = unlockedAchievements.has(achievement.id);
            return (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={unlocked}
                unlockedAt={unlocked ? Date.now() : undefined}
                compact={true}
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
    </div>
  );
};
