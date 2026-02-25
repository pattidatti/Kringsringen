import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsContent } from './SettingsContent';
import { FantasyButton } from './FantasyButton';
import { FantasyPanel } from './FantasyPanel';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
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
                        className="relative z-10 w-full max-w-3xl mx-4 max-h-[85vh] h-[600px] flex flex-col"
                        initial={{ opacity: 0, scale: 0.95, y: 18 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 18 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
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
                                        Innstillinger
                                    </h2>
                                    <div className="h-[2px] w-12 bg-gradient-to-l from-transparent via-amber-700/40 to-amber-900/80 rounded-full" />
                                </div>
                            </div>

                            {/* Content area: the settings content fills the space */}
                            <div className="flex-1 overflow-hidden min-h-0">
                                <SettingsContent inBookContext={true} />
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
            )}
        </AnimatePresence>
    );
};
