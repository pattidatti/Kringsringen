import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighscores } from '../../hooks/useHighscores';
import { FantasyButton } from './FantasyButton';
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
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleBackdropClick}
        >
          {/* Blood vignette effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(80,0,0,0.3) 100%)' }}
          />

          {/* Modal panel */}
          <motion.div
            className="relative flex flex-col items-center gap-6 z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {/* Container with border */}
            <div className="w-full border-2 border-red-800/60 bg-black/90 rounded-lg overflow-hidden flex flex-col">
              {/* Title */}
              <div className="border-b-2 border-red-800/40 px-8 py-6 bg-red-950/20">
                <h2
                  className="font-cinzel text-5xl text-center tracking-[0.15em] uppercase"
                  style={{
                    color: '#ffd700',
                    textShadow: '0 0 20px rgba(255,215,0,0.6), 2px 2px 0 #000, -2px -2px 0 #000',
                  }}
                >
                  Høyeste Poengsum
                </h2>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                {loading ? (
                  // Loading state
                  <motion.div
                    className="flex flex-col items-center justify-center gap-4 py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="w-12 h-12 border-3 border-red-800/60 border-t-red-400 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <p className="font-cinzel text-red-400 text-lg tracking-widest uppercase">
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
                    <p className="font-cinzel text-red-400 text-center text-lg tracking-widest uppercase">
                      {error}
                    </p>
                    <FantasyButton
                      label="Prøv Igjen"
                      variant="danger"
                      onClick={() => refetch()}
                      className="w-48"
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
                    <p className="font-cinzel text-red-400 text-center text-lg tracking-widest uppercase">
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
                    <div className="grid grid-cols-12 gap-2 mb-2 pb-4 border-b-2 border-red-800/40">
                      <div className="col-span-1 text-center">
                        <span className="font-cinzel text-xs text-red-400 uppercase tracking-widest">Rank</span>
                      </div>
                      <div className="col-span-4">
                        <span className="font-cinzel text-xs text-red-400 uppercase tracking-widest">Navn</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="font-cinzel text-xs text-red-400 uppercase tracking-widest">Score</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="font-cinzel text-xs text-red-400 uppercase tracking-widest">Lvl</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="font-cinzel text-xs text-red-400 uppercase tracking-widest">Fase</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="font-cinzel text-xs text-amber-300 uppercase tracking-widest">Gull</span>
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
            </div>

            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute -top-4 -right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-red-900/80 border-2 border-red-600 text-white font-cinzel font-bold text-xl hover:bg-red-800 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              ✕
            </motion.button>
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
      className="grid grid-cols-12 gap-2 p-3 rounded border-l-4 border-l-red-800/60 bg-red-950/10 hover:bg-red-950/20 transition-colors"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
    >
      {/* Rank */}
      <div className="col-span-1 flex items-center justify-center">
        <span className="font-cinzel text-white font-bold">{rank}</span>
      </div>

      {/* Name */}
      <div className="col-span-4 flex items-center truncate">
        <span className="font-cinzel text-white truncate">{score.name}</span>
      </div>

      {/* Score */}
      <div className="col-span-2 flex items-center justify-end">
        <span className="font-cinzel text-amber-300 font-bold">
          {score.score.toLocaleString()}
        </span>
      </div>

      {/* Level */}
      <div className="col-span-1 flex items-center justify-center">
        <span className="font-cinzel text-white">{score.level}</span>
      </div>

      {/* Wave */}
      <div className="col-span-2 flex items-center justify-center">
        <span className="font-cinzel text-white">{score.wave}</span>
      </div>

      {/* Coins */}
      <div className="col-span-2 flex items-center justify-end">
        <span className="font-cinzel text-amber-300">{score.coins}</span>
      </div>
    </motion.div>
  );
};
