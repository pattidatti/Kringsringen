import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UpdateNotificationProps {
    needRefresh: boolean;
    onUpdate: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ needRefresh, onUpdate }) => {
    const [updating, setUpdating] = useState(false);

    const handleUpdate = useCallback(() => {
        if (updating) return;
        setUpdating(true);
        onUpdate();
        // Fallback: force reload if SW controlling event doesn't fire
        setTimeout(() => { window.location.reload(); }, 3000);
    }, [updating, onUpdate]);

    if (!needRefresh) return null;

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
                        onClick={handleUpdate}
                        disabled={updating}
                        className={`mt-1 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded border border-amber-600/50 transition-colors flex items-center justify-center gap-2 ${
                            updating
                                ? 'text-amber-900/70 bg-gradient-to-b from-amber-200/60 to-amber-400/60 cursor-not-allowed'
                                : 'text-black bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 cursor-pointer'
                        }`}
                    >
                        {updating && (
                            <motion.div
                                className="w-3 h-3 border-2 border-amber-900/20 border-t-amber-700 rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                        )}
                        {updating ? 'Oppdaterer...' : 'Oppdater nå'}
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
