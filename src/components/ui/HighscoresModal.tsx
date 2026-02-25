import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighscores } from '../../hooks/useHighscores';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';
import type { Highscore } from '../../config/firebase';

interface HighscoresModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HighscoresModal: React.FC<HighscoresModalProps> = ({ isOpen, onClose }) => {
  const { highscores, loading, error, refetch } = useHighscores();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 100%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleBackdropClick}
        >

          {/* Modal panel */}
          <motion.div
            className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 18 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <FantasyPanel variant="paper" contentPadding="p-6 flex flex-col h-full" className="w-full h-full flex flex-col shadow-2xl">
              {/* Title */}
              <div className="flex flex-col items-center mb-6 mt-2">
                <div className="flex items-center justify-center gap-4">
                  <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-amber-700/40 to-amber-900/80 rounded-full" />
                  <h2
                    className="font-cinzel font-bold text-center text-3xl tracking-[0.15em] uppercase text-amber-900"
                    style={{ textShadow: '0 2px 4px rgba(120,53,15,0.2)' }}
                  >
                    Høyeste Poengsum
                  </h2>
                  <div className="h-[2px] w-12 bg-gradient-to-l from-transparent via-amber-700/40 to-amber-900/80 rounded-full" />
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar min-h-0">
                {loading ? (
                  // Loading state
                  <motion.div
                    className="flex flex-col items-center justify-center gap-4 py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="w-12 h-12 border-3 border-amber-900/20 border-t-amber-700 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <p className="font-cinzel text-amber-900 text-lg tracking-widest uppercase font-bold">
                      Laster inn...
                    </p>
                  </motion.div>
                ) : error ? (
                  // Error state
                  <motion.div
                    className="flex flex-col items-center justify-center gap-6 py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="font-cinzel text-red-800 font-bold text-center text-lg tracking-widest uppercase">
                      {error}
                    </p>
                    <FantasyButton
                      label="Prøv Igjen"
                      variant="primary"
                      onClick={() => refetch()}
                      className="w-48 !text-black [text-shadow:none]"
                    />
                  </motion.div>
                ) : highscores.length === 0 ? (
                  // Empty state
                  <motion.div
                    className="flex flex-col items-center justify-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="font-cinzel text-amber-950/70 font-bold text-center text-lg tracking-widest uppercase">
                      Ingen poengsum ennå
                    </p>
                  </motion.div>
                ) : (
                  // Scores table
                  <motion.div
                    className="w-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 mb-2 pb-2 pl-4 border-b border-amber-900/40">
                      <div className="col-span-1 text-center">
                        <span className="font-cinzel font-bold text-xs text-amber-900/80 uppercase tracking-widest">Rank</span>
                      </div>
                      <div className="col-span-4">
                        <span className="font-cinzel font-bold text-xs text-amber-900/80 uppercase tracking-widest">Navn</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="font-cinzel font-bold text-xs text-amber-900/80 uppercase tracking-widest">Score</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="font-cinzel font-bold text-xs text-amber-900/80 uppercase tracking-widest">Lvl</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="font-cinzel font-bold text-xs text-amber-900/80 uppercase tracking-widest">Fase</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="font-cinzel font-bold text-xs text-amber-600 uppercase tracking-widest">Gull</span>
                      </div>
                    </div>

                    {/* Table rows */}
                    <div className="space-y-2">
                      {highscores.map((score, index) => (
                        <HighscoreRow key={score.id} rank={index + 1} score={score} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Close button inside panel */}
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
      )}
    </AnimatePresence>
  );
};

interface HighscoreRowProps {
  rank: number;
  score: Highscore;
}

const HighscoreRow: React.FC<HighscoreRowProps> = ({ rank, score }) => {
  return (
    <motion.div
      className="grid grid-cols-12 gap-2 p-3 pl-4 rounded border-l-4 border-l-amber-900/40 bg-amber-900/5 hover:bg-amber-900/10 transition-colors"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
    >
      {/* Rank */}
      <div className="col-span-1 flex items-center justify-center">
        <span className="font-cinzel text-amber-950 font-bold">{rank}</span>
      </div>

      {/* Name */}
      <div className="col-span-4 flex items-center truncate">
        <span className="font-cinzel text-amber-950 truncate font-semibold">{score.name}</span>
      </div>

      {/* Score */}
      <div className="col-span-2 flex items-center justify-end">
        <span className="font-cinzel text-amber-700 font-bold">
          {score.score.toLocaleString()}
        </span>
      </div>

      {/* Level */}
      <div className="col-span-1 flex items-center justify-center">
        <span className="font-cinzel text-amber-950/80 font-semibold">{score.level}</span>
      </div>

      {/* Wave */}
      <div className="col-span-2 flex items-center justify-center">
        <span className="font-cinzel text-amber-950/80 font-semibold">{score.wave}</span>
      </div>

      {/* Coins */}
      <div className="col-span-2 flex items-center justify-end">
        <span className="font-cinzel text-amber-600 font-semibold">{score.coins}</span>
      </div>
    </motion.div>
  );
};
