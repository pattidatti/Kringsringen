import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { FantasyPanel } from './FantasyPanel';
import { type FantasyPanelVariant } from '../../types/fantasy-ui.generated';

export type FantasyButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

interface FantasyButtonProps extends HTMLMotionProps<"button"> {
    variant?: FantasyButtonVariant;
    label?: string;
    children?: React.ReactNode;
    panelVariant?: FantasyPanelVariant; // Optional override
}

// Map button variants to panel variants
const VARIANT_MAP: Record<FantasyButtonVariant, FantasyPanelVariant> = {
    primary: 'wood',
    secondary: 'paper',
    danger: 'obsidian',
    success: 'gold', // Gold for success/shiny for now
};

/**
 * A robust button component that strictly uses the Fantasy UI system.
 * Wraps FantasyPanel to ensure consistent 9-slice rendering.
 */
export const FantasyButton: React.FC<FantasyButtonProps> = ({
    children,
    className,
    variant = 'primary',
    panelVariant,
    label,
    style,
    disabled,
    ...props
}) => {
    // Determine the underlying panel variant
    const resolvedPanelVariant = panelVariant || VARIANT_MAP[variant];

    return (
        <motion.button
            className={twMerge(
                // Base
                'relative inline-flex items-center justify-center',
                'font-fantasy text-black tracking-wide uppercase',
                'transition-all duration-100 ease-in-out',
                'bg-transparent border-none p-0 cursor-pointer', // Reset button styles

                // Disabled
                'disabled:opacity-50 disabled:grayscale disabled:pointer-events-none',

                className
            )}
            whileHover={!disabled ? { scale: 1.05, filter: 'brightness(1.1)' } : {}}
            whileTap={!disabled ? { scale: 0.95, filter: 'brightness(0.9)' } : {}}
            style={{
                ...style,
            }}
            disabled={disabled}
            onPointerDown={() => {
                import('../../game/AudioManager').then(({ AudioManager }) => {
                    AudioManager.instance.resumeContext();
                    AudioManager.instance.playSFX('ui_click');
                });
            }}
            {...props}
        >
            {/* The Background Panel */}
            <div className="absolute inset-0 z-0">
                <FantasyPanel
                    variant={resolvedPanelVariant}
                    className="w-full h-full"
                    scale={2} // Slightly smaller scale for buttons
                    contentPadding="p-0"
                />
            </div>

            {/* Label / Content */}
            <span className="relative z-10 px-6 py-3 drop-shadow-md text-sm md:text-base font-bold pointer-events-none flex items-center justify-center gap-2">
                {label || children}
            </span>

            {/* Shine Effect (Optional layer on top) */}
            <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none rounded-sm">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-30" />
            </div>
        </motion.button>
    );
};
