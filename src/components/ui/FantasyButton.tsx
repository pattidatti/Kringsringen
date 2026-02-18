
import React, { type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { useSprite } from '../../hooks/useSprite';
import { twMerge } from 'tailwind-merge';

interface FantasyButtonProps extends HTMLMotionProps<"button"> {
    variant?: 'primary' | 'secondary';
    label?: string;
    children?: ReactNode; // Override children to exclude MotionValue if we want, or use motion.span
}

export const FantasyButton: React.FC<FantasyButtonProps> = ({
    children,
    className,
    variant = 'primary',
    label,
    ...props
}) => {
    // Determine sprite keys based on variant
    // This is a simplification. Ideally, we map variants to specific sprite keys.
    const spriteBase = `button_${variant}_normal`;
    const spriteHover = `button_${variant}_hover`;
    const spritePressed = `button_${variant}_pressed`;

    // We are using a simple approach here: just changing the class or style on hover/active.
    // However, with sprites, we need to change backgroundPosition.
    // A cleaner way is to use state to track hover/active, or just CSS if we map sprites to classes.
    // Since we are using JS styles for sprites, we need state.

    const [state, setState] = React.useState<'normal' | 'hover' | 'pressed'>('normal');

    const currentSpriteKey = state === 'pressed'
        ? spritePressed
        : state === 'hover'
            ? spriteHover
            : spriteBase;

    // TypeScript hack because we haven't defined all keys in atlas yet
    const { style } = useSprite({ sprite: currentSpriteKey as any });

    return (
        <motion.button
            className={twMerge(
                'relative inline-flex items-center justify-center px-6 py-2 text-white font-fantasy text-lg',
                'outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-slate-900',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                className
            )}
            style={{
                ...style,
                // Override generic sprite style to allow scaling/stretching if needed
                // For buttons, we might want 9-slice, but let's start with simple background for now.
                // If the button is fixed size in atlas, we keep it fixed.
                backgroundSize: '100% 100%', // Try to stretch 
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setState('hover')}
            onMouseLeave={() => setState('normal')}
            onMouseDown={() => setState('pressed')}
            onMouseUp={() => setState('hover')}
            {...props}
        >
            <motion.span className="drop-shadow-md z-10">{label || children as ReactNode}</motion.span>
        </motion.button>
    );
};
