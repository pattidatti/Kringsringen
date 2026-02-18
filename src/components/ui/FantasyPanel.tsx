
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { UI_ATLAS } from '../../config/ui-atlas';

interface FantasyPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'wood' | 'paper';
}

export const FantasyPanel: React.FC<FantasyPanelProps> = ({
    children,
    className,
    variant = 'wood',
    style,
    ...props
}) => {
    // 9-slice implementation using border-image
    // We need the source URL and the slice value
    const spriteKey = `panel_${variant}`;
    // Type assertion for now until atlas is fully populated
    const frame = (UI_ATLAS.frames as any)[spriteKey];
    const source = UI_ATLAS.sources.panels;

    const borderImageStyle = frame ? {
        borderImageSource: `url(${source})`,
        borderImageSlice: frame.slice || 16,
        borderImageWidth: `${frame.slice || 16}px`,
        borderImageRepeat: 'stretch', // or 'round' or 'repeat'
        borderWidth: `${frame.slice || 16}px`,
    } : {};

    return (
        <div
            className={twMerge(
                'relative bg-slate-800/50 p-4', // Fallback bg
                'text-amber-100 font-fantasy',
                className
            )}
            style={{
                ...borderImageStyle,
                imageRendering: 'pixelated',
                ...style,
            }}
            {...props}
        >
            {/* Content wrapper to ensure text doesn't overlap borders if needed */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};
