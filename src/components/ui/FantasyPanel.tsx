import React from 'react';
import { twMerge } from 'tailwind-merge';

import { FANTASY_UI_CONFIG, type FantasyPanelVariant } from '../../types/fantasy-ui.generated';

// Import extracted assets directly
// Note: In a larger app, we might want to lazy load these or use a dynamic import map,
// but for standard UI elements, direct imports ensure they are bundled.
import panelWood from '../../assets/ui/fantasy/panels/wood.png';
import panelPaper from '../../assets/ui/fantasy/panels/paper.png';
import panelStone from '../../assets/ui/fantasy/panels/stone.png';
import panelGold from '../../assets/ui/fantasy/panels/gold.png';
import panelObsidian from '../../assets/ui/fantasy/panels/obsidian.png';

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

    // Get slice config from generated atlas or default to 10
    const slice = (FANTASY_UI_CONFIG.panels as any)[variant] || { top: 10, right: 10, bottom: 10, left: 10 };

    return (
        <div
            className={twMerge(
                'relative',
                className
            )}
            style={{
                borderStyle: 'solid',
                borderWidth: `${slice.top * scale}px`,
                borderImageSource: `url(${bgImage})`,
                borderImageSlice: `${slice.top} ${slice.right} ${slice.bottom} ${slice.left} fill`,
                borderImageWidth: `${slice.top * scale}px`,
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
