import React from 'react';
import { FantasyButton } from './FantasyButton';

interface MenuAnchorProps {
    onClick: () => void;
    isOpen?: boolean;
}

export const MenuAnchor: React.FC<MenuAnchorProps> = ({ onClick, isOpen }) => {
    return (
        <div className="fixed bottom-4 left-4 z-50 pointer-events-auto">
            <div className="relative">
                <FantasyButton
                    onClick={onClick}
                    label={isOpen ? "Lukk" : "Bok"}
                    variant={isOpen ? "danger" : "primary"}
                    className={`w-16 h-16 rounded-md !p-0 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-110 active:scale-95`}
                />

                {/* Hotkey badge */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-black/70 border border-amber-500/50 rounded flex items-center justify-center z-40 shadow-sm pointer-events-none">
                    <span className="text-sm text-amber-200 font-mono font-bold leading-none">{isOpen ? 'Esc' : 'B'}</span>
                </div>
            </div>

            {/* Tooltip/Hint */}
            <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity bg-black/80 text-amber-100 text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap">
                {isOpen ? 'Close Book (ESC)' : 'Open Book (B)'}
            </div>
        </div>
    );
};
