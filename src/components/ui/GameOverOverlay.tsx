import React, { useCallback } from 'react';
import { useGameRegistry } from '../../hooks/useGameRegistry';
import { MedievalPanel } from './MedievalPanel';
import { MedievalButton } from './MedievalButton';

export const GameOverOverlay: React.FC = () => {
    const hp = useGameRegistry('playerHP', 100);

    const handleRestart = useCallback(() => {
        window.location.reload();
    }, []);

    if (hp > 0) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/90 animate-in fade-in duration-1000 medieval-pixel overflow-hidden">
            <div className="m-vignette" />

            <div className="relative flex flex-col items-center scale-up-center gap-8 z-50">
                {/* Text Group */}
                <div className="text-center space-y-2 mb-4">
                    <h2 className="m-text-blood text-6xl tracking-widest leading-none m-text-outline drop-shadow-xl animate-pulse">FALNET</h2>
                    <p className="m-text-hud text-amber-500 text-sm tracking-widest uppercase opacity-80">Din saga ender her</p>
                </div>

                {/* Medieval Panel */}
                <MedievalPanel className="w-64 p-4 items-center gap-6 shadow-2xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] scale-150">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <p className="text-[10px] text-amber-900/60 font-serif italic">
                            "Even the mightiest fall..."
                        </p>
                    </div>

                    <div className="flex gap-4 mt-2">
                        <MedievalButton
                            label="Prøv Igjen"
                            onClick={handleRestart}
                            variant="primary"
                            className="scale-125"
                        />
                    </div>
                </MedievalPanel>
            </div>
        </div>
    );
};
