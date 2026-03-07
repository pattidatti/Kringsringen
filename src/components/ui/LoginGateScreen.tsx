/**
 * LoginGateScreen – Initial screen after clicking "Spill"
 * Gives players the option to log in for cloud sync or continue without login.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FantasyPanel } from './FantasyPanel';
import { FantasyButton } from './FantasyButton';
import { LoginModal } from './LoginModal';
import { useAuth } from '../../contexts/AuthContext';

// ─── Props ──────────────────────────────────────────────────────────────────

interface LoginGateScreenProps {
    /** Called when user clicks "Continue without login" or completes login */
    onContinue: () => void;
    /** Called when user completes login and sync */
    onLoginComplete: () => void;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const LoginGateScreen: React.FC<LoginGateScreenProps> = ({
    onContinue,
    onLoginComplete,
}) => {
    const { user } = useAuth();
    const [dontAskAgain, setDontAskAgain] = useState(false);

    const handleContinue = () => {
        // Save preference if user checked "Don't ask again"
        if (dontAskAgain) {
            localStorage.setItem('kringsringen_skip_login_gate', 'true');
        }
        onContinue();
    };

    const handleSyncComplete = () => {
        // User logged in and synced successfully
        onLoginComplete();
    };

    return (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            </div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md mx-6"
            >
                <FantasyPanel variant="paper" contentPadding="p-8">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h1 className="font-cinzel text-3xl font-bold tracking-[0.15em] uppercase text-amber-900 mb-3">
                            Velkommen til
                        </h1>
                        <h2 className="font-fantasy text-4xl tracking-widest uppercase text-amber-800 mb-4">
                            Krigsringen
                        </h2>
                        <div className="h-0.5 w-48 bg-gradient-to-r from-transparent via-amber-900/50 to-transparent mx-auto mb-4" />
                        <p className="font-crimson text-amber-800/80 text-sm leading-relaxed">
                            Logg inn for å synkronisere karakterene dine på tvers av enheter,
                            eller fortsett uten innlogging for å spille offline.
                        </p>
                    </div>

                    {/* Login section */}
                    <div className="mb-6">
                        <LoginModal onSyncComplete={handleSyncComplete} />
                    </div>

                    {/* Divider */}
                    {!user && (
                        <>
                            <div className="flex items-center gap-3 my-6">
                                <div className="flex-1 h-px bg-amber-900/20" />
                                <span className="font-cinzel text-xs text-amber-800/50 uppercase tracking-widest">
                                    eller
                                </span>
                                <div className="flex-1 h-px bg-amber-900/20" />
                            </div>

                            {/* Continue without login */}
                            <div className="space-y-4">
                                <FantasyButton
                                    label="Fortsett uten innlogging"
                                    variant="secondary"
                                    onClick={handleContinue}
                                    className="w-full text-base !text-black [text-shadow:none]"
                                />

                                {/* "Don't ask again" checkbox */}
                                <label className="flex items-center gap-2 cursor-pointer select-none group justify-center">
                                    <input
                                        type="checkbox"
                                        checked={dontAskAgain}
                                        onChange={(e) => setDontAskAgain(e.target.checked)}
                                        className="w-3.5 h-3.5 accent-amber-700 cursor-pointer"
                                    />
                                    <span className="font-cinzel text-amber-900/70 font-bold text-[10px] tracking-widest uppercase group-hover:text-amber-900 transition-colors">
                                        Ikke spør igjen
                                    </span>
                                </label>

                                {/* Offline notice */}
                                <p className="text-xs text-amber-700/60 text-center font-crimson italic">
                                    Du kan fortsatt spille offline. Progresjon lagres lokalt på denne enheten.
                                </p>
                            </div>
                        </>
                    )}
                </FantasyPanel>
            </motion.div>
        </div>
    );
};
