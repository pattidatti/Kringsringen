import React from 'react';
import { AchievementGrid } from './AchievementGrid';
import { FantasyPanel } from './FantasyPanel';

/**
 * Achievement Book Overlay - Full Book Cover with Sprite Panel
 *
 * Renders as an absolute inset-0 panel inside the book container using the
 * same FantasyPanel (9-slice sprite) system as HighscoresModal and LandingPage.
 * Variant "paper" matches the parchment aesthetic of the book pages.
 */
export const AchievementBookOverlay: React.FC = () => {
  return (
    <FantasyPanel
      variant="paper"
      className="h-full w-full shadow-2xl"
      contentPadding="px-6 pt-4 pb-6 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex flex-col items-center mb-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-4 mb-1">
          <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-amber-700/40 to-amber-900/80 rounded-full" />
          <h2
            className="font-cinzel font-bold text-center text-3xl tracking-[0.15em] uppercase text-amber-900"
            style={{ textShadow: '0 2px 4px rgba(120,53,15,0.2)' }}
          >
            🏆 Prestasjoner
          </h2>
          <div className="h-[2px] w-12 bg-gradient-to-l from-transparent via-amber-700/40 to-amber-900/80 rounded-full" />
        </div>
      </div>

      {/* Scrollable achievement grid — min-h-0 prevents overflow past panel bottom */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-3">
        <AchievementGrid showFilters={true} showStats={true} />
      </div>
    </FantasyPanel>
  );
};
