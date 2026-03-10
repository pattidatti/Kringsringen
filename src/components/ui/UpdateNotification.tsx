import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UpdateNotificationProps {
    needRefresh: boolean;
    onUpdate: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ needRefresh, onUpdate }) => {
    const [dismissed, setDismissed] = useState(false);

    if (!needRefresh || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -200, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                className="absolute top-4 left-4 z-20 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-900/90 via-amber-800/90 to-amber-900/90 border border-amber-500/50 rounded shadow-[0_0_20px_rgba(255,215,0,0.2)] backdrop-blur-sm"
            >
                <div className="flex flex-col">
                    <span className="font-cinzel text-xs text-amber-200/80 uppercase tracking-[0.15em] font-bold">
                        Ny oppdatering!
                    </span>
                    <button
                        onClick={onUpdate}
                        className="mt-1 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black bg-gradient-to-b from-amber-300 to-amber-500 rounded border border-amber-600/50 hover:from-amber-200 hover:to-amber-400 transition-colors cursor-pointer"
                    >
                        Oppdater nå
                    </button>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-amber-400/60 hover:text-amber-200 text-lg leading-none cursor-pointer"
                    aria-label="Lukk"
                >
                    ✕
                </button>
            </motion.div>
        </AnimatePresence>
    );
};
