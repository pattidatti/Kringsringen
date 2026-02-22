import React from 'react';
import { FantasyButton } from './FantasyButton';

interface MenuAnchorProps {
    onClick: () => void;
    isOpen?: boolean;
}

export const MenuAnchor: React.FC<MenuAnchorProps> = ({ onClick, isOpen }) => {
    return (
        <div className="fixed bottom-4 left-4 z-50 pointer-events-auto">
            <FantasyButton
                onClick={onClick}
                label={isOpen ? "Close" : "Menu"}
                className={`w-16 h-16 rounded-full !p-0 flex items-center justify-center border-4 ${isOpen ? 'border-red-900 bg-red-950' : 'border-amber-700 bg-slate-900'} shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-110 active:scale-95`}
            >
                {/* Icon Layer */}
                <div className={`text-2xl transition-transform duration-500 ${isOpen ? 'rotate-90' : 'rotate-0'}`}>
                    {isOpen ? '✕' : '☰'}
                </div>
            </FantasyButton>

            {/* Tooltip/Hint */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 hover:opacity-100 transition-opacity bg-black/80 text-amber-100 text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap">
                {isOpen ? 'Close Book (ESC)' : 'Open Book (B)'}
            </div>
        </div>
    );
};
