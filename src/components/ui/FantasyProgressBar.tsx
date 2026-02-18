import React from 'react';
import { twMerge } from 'tailwind-merge';


interface FantasyProgressBarProps {
    value: number;
    max: number;
    variant?: 'health' | 'xp' | 'stamina';
    showLabel?: boolean;
    label?: string;
    width?: string | number;
    className?: string;
}

export const FantasyProgressBar: React.FC<FantasyProgressBarProps> = ({
    value,
    max,
    variant = 'health',
    showLabel = true,
    label,
    width = '100%',
    className,
}) => {
    // We use the health frame for all bars for now, but colors differ
    // If we had bar_xp_frame, we'd use that.
    // If we had bar_xp_frame, we'd use that.


    // Calculate percentage
    const percent = Math.min(100, Math.max(0, (value / max) * 100));

    // Determine gradient based on variant
    const getGradient = () => {
        switch (variant) {
            case 'health': return 'linear-gradient(90deg, #7f1d1d 0%, #dc2626 50%, #f87171 100%)'; // Red
            case 'xp': return 'linear-gradient(90deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)'; // Blue/Sky
            case 'stamina': return 'linear-gradient(90deg, #14532d 0%, #16a34a 50%, #4ade80 100%)'; // Green
            default: return 'linear-gradient(90deg, #7f1d1d 0%, #dc2626 50%, #f87171 100%)';
        }
    };

    const getShadowColor = () => {
        switch (variant) {
            case 'health': return 'rgba(220, 38, 38, 0.4)';
            case 'xp': return 'rgba(2, 132, 199, 0.4)';
            case 'stamina': return 'rgba(22, 163, 74, 0.4)';
            default: return 'rgba(0,0,0,0.5)';
        }
    };

    return (
        <div
            className={twMerge("relative flex flex-col gap-1", className)}
            style={{ width }}
        >
            {/* Label Row */}
            {showLabel && (
                <div className="flex justify-between items-end px-1">
                    <span className="m-text-stats text-[10px] tracking-widest opacity-60 uppercase">
                        {label || (variant === 'xp' ? 'Erfaring' : variant === 'health' ? 'Vitalitet' : 'Utmattelse')}
                    </span>
                    <span className="m-text-stats text-[10px] font-black tabular-nums">
                        {variant === 'xp' ? `${Math.floor(percent)}%` : `${Math.ceil(value)} / ${max}`}
                    </span>
                </div>
            )}

            {/* Bar Container */}
            {/* 
               We render the frame as a container. 
               Since we want it to stretch, we might need to adjust how we apply the sprite.
               If the sprite is a fixed size frame, 9-slice via border-image is best if possible.
               However, `useSprite` returns a background-image style for a single quad.
               
               Workaround: 
               We will use a standard div with borders that mimic the fantasy look, 
               PLUS the sprite as a decorative overlay or just use CSS borders if the sprite isn't 9-slice ready yet.
               
               Given the atlas has `bar_health_frame`, let's try to use it as a background for the container,
               but stretching it might look weird if it's not designed for it.
               
               Let's assume standard CSS styling for the container with a border for now 
               to ensure it looks good at any width, and maybe add the sprite as an icon or cap?
               
               Actually, let's try to use the sprite as a background but allow it to stretch horizontally.
            */}
            <div
                className="relative h-5 bg-slate-950/60 rounded-sm overflow-hidden border border-amber-900/30"
                style={{
                    boxShadow: `0 0 10px ${getShadowColor()}`
                }}
            >
                {/* Background Pattern/Texture (Optional) */}

                {/* Fill */}
                <div
                    className="h-full transition-all duration-300 ease-out relative"
                    style={{
                        width: `${percent}%`,
                        background: getGradient(),
                    }}
                >
                    {/* Shine effect on the bar */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50" />
                </div>

                {/* Frame Overlay (if we had a transparent middle frame, we'd put it here) */}
                {/* For now, just a border is sufficient for "Avant-Garde" cleaner look */}
            </div>
        </div>
    );
};
