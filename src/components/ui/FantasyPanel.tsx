import React from 'react';
import { twMerge } from 'tailwind-merge';

// Import extracted assets directly
import panelWood from '../../assets/ui/fantasy/panels/panel_wood.png';
import panelPaper from '../../assets/ui/fantasy/panels/panel_paper.png';
import panelStone from '../../assets/ui/fantasy/panels/panel_stone.png';
import panelGold from '../../assets/ui/fantasy/panels/panel_gold.png';
import panelObsidian from '../../assets/ui/fantasy/panels/panel_obsidian.png';

export type FantasyPanelVariant = 'wood' | 'paper' | 'stone' | 'gold' | 'obsidian';

// Slice config per variant (extracted images are smaller now, but slice logic is same relative to edges)
// The extracted images are 28x31 (based on wood).
// The slice values need to match the new image dimensions.
// Wood was 10,10 top/left.
const PANEL_ASSETS: Record<FantasyPanelVariant, string> = {
    wood: panelWood,
    paper: panelPaper,
    stone: panelStone,
    gold: panelGold,
    obsidian: panelObsidian,
};

const SLICE_CONFIG = {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
};

interface FantasyPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: FantasyPanelVariant;
    contentPadding?: string;
    /** Scale factor for the border image width */
    scale?: number;
}

/**
 * A robust 9-slice panel component using extracted assets for perfect tiling.
 * Uses standard CSS `border-image` for performance and simplicity.
 */
export const FantasyPanel: React.FC<FantasyPanelProps> = ({
    children,
    className,
    variant = 'wood',
    style,
    contentPadding = 'p-6',
    scale = 3, // Default scale to make it look chunky/pixelated
    ...props
}) => {
    const bgImage = PANEL_ASSETS[variant] || PANEL_ASSETS.wood;

    return (
        <div
            className={twMerge(
                'relative',
                className
            )}
            style={{
                borderStyle: 'solid',
                borderWidth: `${SLICE_CONFIG.top * scale}px`,
                borderImageSource: `url(${bgImage})`,
                borderImageSlice: `${SLICE_CONFIG.top} ${SLICE_CONFIG.right} ${SLICE_CONFIG.bottom} ${SLICE_CONFIG.left} fill`,
                borderImageWidth: `${SLICE_CONFIG.top * scale}px`,
                borderImageRepeat: 'stretch', // or 'round'
                imageRendering: 'pixelated',
                ...style,
            }}
            {...props}
        >
            {/* Content wrapper to handle padding inside the border-box */}
            <div className={twMerge("relative z-10 w-full h-full", contentPadding)}>
                {children}
            </div>
        </div>
    );
};
