import React from 'react';
import { AchievementGrid } from './AchievementGrid';

/**
 * Achievement Book Overlay - Dobbelside Layout
 *
 * Renders achievements as a "double-page spread" inside FantasyBook.
 * Features:
 * - Parchment background overlay matching book aesthetics
 * - Visible custom scrollbar (amber gradient)
 * - Responsive layout using book dimension CSS variables
 * - Wraps AchievementGrid with book-themed container
 */
export const AchievementBookOverlay: React.FC = () => {
  return (
    <div className="col-span-2 h-full relative">
      {/* Parchment background overlay - subtle, matches book pages */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(227, 218, 201, 0.3) 0%, rgba(227, 218, 201, 0.15) 100%)',
        }}
      />

      {/* Content layer */}
      <div className="relative h-full flex flex-col px-12 py-6">
        {/* Header - Fantasy book title style */}
        <div className="flex flex-col items-center mb-6">
          <h2
            className="font-cinzel font-bold text-center text-3xl tracking-[0.15em] uppercase text-amber-900 mb-2"
            style={{ textShadow: '0 2px 4px rgba(120,53,15,0.2)' }}
          >
            🏆 Prestasjoner
          </h2>

          {/* Decorative divider */}
          <div className="flex items-center gap-3 opacity-60">
            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-amber-900/40" />
            <span className="text-amber-950/60 text-xs">✦</span>
            <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-amber-900/40" />
          </div>
        </div>

        {/* Scrollable achievement grid - custom scrollbar visible */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-3">
          <AchievementGrid showFilters={true} showStats={true} />
        </div>
      </div>
    </div>
  );
};
