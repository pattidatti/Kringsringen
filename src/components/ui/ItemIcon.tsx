import React from 'react';
import { useSprite } from '../../hooks/useSprite';
import type { SpriteKey } from '../../config/ui-atlas';

export type ItemIconKey = Extract<SpriteKey, `item_${string}`>;

interface ItemIconProps extends React.HTMLAttributes<HTMLDivElement> {
    icon: ItemIconKey;
    size?: 'sm' | 'md' | 'lg'; // 1x=16px, 2x=32px, 3x=48px
}

const SCALE_MAP = { sm: 1, md: 2, lg: 3 } as const;

export const ItemIcon: React.FC<ItemIconProps> = ({
    icon,
    size = 'md',
    className,
    style: extStyle,
    ...props
}) => {
    const scale = SCALE_MAP[size];
    // Always scale=1 to useSprite – we handle scaling via CSS transform
    const { style, frame } = useSprite({ sprite: icon, scale: 1 });

    return (
        <div
            style={{
                width: frame.w * scale,
                height: frame.h * scale,
                overflow: 'hidden',
                display: 'inline-block',
                flexShrink: 0,
                imageRendering: 'pixelated',
                ...extStyle,
            }}
            role="img"
            aria-label={icon.replace('item_', '').replace(/_/g, ' ')}
            className={className}
            {...props}
        >
            <div
                style={{
                    ...style,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                }}
            />
        </div>
    );
};
