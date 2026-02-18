import React from 'react';
import { twMerge } from 'tailwind-merge';

export type FantasyPanelVariant = 'wood' | 'paper' | 'stone' | 'gold' | 'obsidian';

interface PanelConfig {
    x: number;
    y: number;
    w: number;
    h: number;
    slice: { top: number; right: number; bottom: number; left: number };
}

// Default configurations - These will need calibration using the Debug tool
// We use generic guesses based on typical sprite sheet layouts until calibrated
// Calibrated using analyze_frames.cjs - Frame 5 seems to be a wood panel based on position
// Dimensions are tight to the sprite content to avoid transparency issues
import itemSrc from '../../assets/ui/fantasy/UI_Frames.png';

const PANEL_VARIANTS: Record<FantasyPanelVariant, PanelConfig> = {
    wood: { x: 10, y: 10, w: 28, h: 31, slice: { top: 10, right: 10, bottom: 10, left: 10 } },
    paper: { x: 58, y: 10, w: 28, h: 31, slice: { top: 10, right: 10, bottom: 10, left: 10 } }, // Frame 6
    stone: { x: 106, y: 10, w: 28, h: 31, slice: { top: 10, right: 10, bottom: 10, left: 10 } }, // Frame 7
    gold: { x: 154, y: 10, w: 28, h: 31, slice: { top: 10, right: 10, bottom: 10, left: 10 } }, // Frame 8
    obsidian: { x: 202, y: 10, w: 28, h: 31, slice: { top: 10, right: 10, bottom: 10, left: 10 } }, // Frame 9
};

interface FantasyPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: FantasyPanelVariant;
    /** Custom sprite configuration if variant doesn't match perfectly */
    customConfig?: Partial<PanelConfig>;
    /** content padding to preventing overlap with borders */
    contentPadding?: string;
}

/**
 * A robust 9-slice panel component that strictly uses the Cute_Fantasy_UI sprite sheet.
 * Uses a 3x3 grid approach to avoid border-image limitations with sprite sheets.
 */
export const FantasyPanel: React.FC<FantasyPanelProps> = ({
    children,
    className,
    variant = 'wood',
    customConfig,
    style,
    contentPadding = 'p-6',
    ...props
}) => {
    const baseConfig = PANEL_VARIANTS[variant] || PANEL_VARIANTS.wood;
    const config = { ...baseConfig, ...customConfig };

    const { x, y, w, h, slice } = config;
    const { top, right, bottom, left } = slice;

    // Helper to calculate background position
    // We shift the background by negative (sprite_x + offset)
    const bgPos = (offsetX: number, offsetY: number) =>
        `-${x + offsetX}px -${y + offsetY}px`;

    return (
        <div
            className={twMerge(
                'relative',
                className
            )}
            style={style}
            {...props}
        >
            {/* 9-Slice Grid Background */}
            <div
                className="absolute inset-0 grid pointer-events-none"
                style={{
                    gridTemplateColumns: `${left}px 1fr ${right}px`,
                    gridTemplateRows: `${top}px 1fr ${bottom}px`,
                }}
            >
                {/* Top Row */}
                <div style={{ backgroundImage: `url(${itemSrc})`, backgroundPosition: bgPos(0, 0), width: left, height: top, imageRendering: 'pixelated' }} />
                <div style={{ backgroundImage: `url(${itemSrc})`, backgroundPosition: bgPos(left, 0), height: top, imageRendering: 'pixelated', backgroundRepeat: 'repeat-x' }} />
                <div style={{ backgroundImage: `url(${itemSrc})`, backgroundPosition: bgPos(w - right, 0), width: right, height: top, imageRendering: 'pixelated' }} />

                {/* Middle Row */}
                <div style={{ backgroundImage: `url(${itemSrc})`, backgroundPosition: bgPos(0, top), width: left, imageRendering: 'pixelated', backgroundRepeat: 'repeat-y' }} />
                <div style={{ backgroundImage: `url(${itemSrc})`, backgroundPosition: bgPos(left, top), imageRendering: 'pixelated', backgroundColor: 'rgba(0,0,0,0.4)' }} />
                <div style={{ backgroundImage: `url(${itemSrc})`, backgroundPosition: bgPos(w - right, top), width: right, imageRendering: 'pixelated', backgroundRepeat: 'repeat-y' }} />

                {/* Bottom Row */}
                <div style={{ backgroundImage: `url(${itemSrc})`, backgroundPosition: bgPos(0, h - bottom), width: left, height: bottom, imageRendering: 'pixelated' }} />
                <div style={{ backgroundImage: `url(${itemSrc})`, backgroundPosition: bgPos(left, h - bottom), height: bottom, imageRendering: 'pixelated', backgroundRepeat: 'repeat-x' }} />
                <div style={{ backgroundImage: `url(${itemSrc})`, backgroundPosition: bgPos(w - right, h - bottom), width: right, height: bottom, imageRendering: 'pixelated' }} />
            </div>

            {/* Content */}
            <div className={twMerge("relative z-10 w-full h-full", contentPadding)}>
                {children}
            </div>
        </div>
    );
};
