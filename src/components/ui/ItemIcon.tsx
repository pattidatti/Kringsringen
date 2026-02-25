import React from 'react';
import { useSprite } from '../../hooks/useSprite';
import type { SpriteKey } from '../../config/ui-atlas';

export type ItemIconKey = Extract<SpriteKey, `item_${string}`>;

interface ItemIconProps extends React.HTMLAttributes<HTMLDivElement> {
    icon: ItemIconKey;
    size?: 'sm' | 'md' | 'lg'; // 1x=16px, 2x=32px, 3x=48px
    fitSize?: number; // Force icon to fit exactly within this dimension uniformly
}

const SCALE_MAP = { sm: 1, md: 2, lg: 3 } as const;

export const ItemIcon: React.FC<ItemIconProps> = ({
    icon,
    size = 'md',
    fitSize,
    className,
    style: extStyle,
    ...props
}) => {
    // Always scale=1 to useSprite – we handle scaling via CSS transform
    const { style, frame } = useSprite({ sprite: icon, scale: 1 });

    // Determine dynamic scale and dimensions
    const baseScale = SCALE_MAP[size];
    const isFitMode = fitSize !== undefined;
    const computedScale = isFitMode ? fitSize / Math.max(frame.w, frame.h) : baseScale;
    const computedWidth = isFitMode ? fitSize : frame.w * baseScale;
    const computedHeight = isFitMode ? fitSize : frame.h * baseScale;

    return (
        <div
            style={{
                width: computedWidth,
                height: computedHeight,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                    transform: `scale(${computedScale})`,
                    transformOrigin: 'center center',
                    width: frame.w,
                    height: frame.h,
                }}
            />
        </div>
    );
};
