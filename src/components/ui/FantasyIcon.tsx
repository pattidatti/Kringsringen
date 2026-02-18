
import React from 'react';
import { useSprite } from '../../hooks/useSprite';
import { twMerge } from 'tailwind-merge';

interface FantasyIconProps extends React.HTMLAttributes<HTMLDivElement> {
    icon: 'sword' | 'shield' | 'heart' | 'coin'; // Typed based on atlas
    size?: 'sm' | 'md' | 'lg';
}

export const FantasyIcon: React.FC<FantasyIconProps> = ({
    icon,
    size = 'md',
    className,
    ...props
}) => {
    const spriteKey = `icon_${icon}`;

    // Scale mapping
    const scaleMap = {
        sm: 1,
        md: 2,
        lg: 4,
    };

    const { style } = useSprite({
        sprite: spriteKey as any,
        scale: scaleMap[size]
    });

    return (
        <div
            className={twMerge('inline-block', className)}
            style={style}
            aria-label={icon}
            {...props}
        />
    );
};
