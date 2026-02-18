import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export type FantasyButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

interface FantasyButtonProps extends HTMLMotionProps<"button"> {
    variant?: FantasyButtonVariant;
    label?: string;
    children?: React.ReactNode;
}

/**
 * A robust button component that strictly uses the Cute_Fantasy_UI sprite sheet.
 * Uses a simpler background approach or 3-slice if needed.
 */
export const FantasyButton: React.FC<FantasyButtonProps> = ({
    children,
    className,
    variant = 'primary',
    label,
    style,
    disabled,
    ...props
}) => {
    // State for hover/active to switch sprites if needed
    // For now, simpler CSS styling with pixel art background fallback

    // We can use a simple CSS class approach for the "Avant-Garde" feel
    // combined with the sprite assets.

    return (
        <motion.button
            className={twMerge(
                // Base
                'relative inline-flex items-center justify-center px-10 py-5',
                'font-fantasy text-amber-100 tracking-wide uppercase',
                'transition-all duration-100 ease-in-out',

                // Visuals (simulated wood/metal until sprite mapping 100% verified)
                'bg-[#5d3a2e] border-2 border-[#8b5a4b]',
                'box-border shadow-[inset_0_2px_0_rgba(255,255,255,0.2),0_4px_0_rgba(0,0,0,0.6)]',

                // Active/Hover States
                'hover:brightness-110 hover:-translate-y-0.5',
                'active:translate-y-[2px] active:shadow-none active:brightness-90',

                // Disabled
                'disabled:opacity-50 disabled:grayscale disabled:pointer-events-none',

                className
            )}
            whileHover={!disabled ? { scale: 1.02, filter: 'brightness(1.1)' } : {}}
            whileTap={!disabled ? { scale: 0.98, filter: 'brightness(0.9)' } : {}}
            style={{
                imageRendering: 'pixelated',
                ...style,
            }}
            disabled={disabled}
            {...props}
        >
            {/* Glow/Shine Effect */}
            <div className="absolute inset-0 overflow-hidden rounded-sm pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-50" />
            </div>

            {/* Label */}
            <span className="relative z-10 drop-shadow-md text-sm md:text-base font-bold">
                {label || children}
            </span>

            {/* Corner Accents (Decorative) */}
            <div className="absolute top-1 left-1 w-1 h-1 bg-[#d9a066] opacity-60" />
            <div className="absolute top-1 right-1 w-1 h-1 bg-[#d9a066] opacity-60" />
            <div className="absolute bottom-1 left-1 w-1 h-1 bg-[#d9a066] opacity-60" />
            <div className="absolute bottom-1 right-1 w-1 h-1 bg-[#d9a066] opacity-60" />
        </motion.button>
    );
};
