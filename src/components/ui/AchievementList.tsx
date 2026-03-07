import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AchievementGrid } from './AchievementGrid';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';

interface AchievementListProps {
  /** Called when modal is closed */
  onClose: () => void;
}

export const AchievementList: React.FC<AchievementListProps> = ({ onClose }) => {

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
              <h2
                className="font-cinzel font-bold text-center text-3xl tracking-[0.15em] uppercase text-amber-900 mb-3"
                style={{ textShadow: '0 2px 4px rgba(120,53,15,0.2)' }}
              >
                🏆 Prestasjoner
              </h2>
            </div>

            {/* Achievement grid component */}
            <AchievementGrid showFilters={true} showStats={true} />

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
