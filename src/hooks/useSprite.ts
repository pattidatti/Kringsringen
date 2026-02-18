
import { type CSSProperties, useMemo } from 'react';
import { UI_ATLAS, type SpriteKey } from '../config/ui-atlas';

interface UseSpriteOptions {
    sprite: SpriteKey;
    scale?: number;
}

export function useSprite({ sprite, scale = 1 }: UseSpriteOptions) {
    return useMemo(() => {
        const frame = UI_ATLAS.frames[sprite];
        // Heuristic matching removed as unused

        // Better logic: map keys to sources explicitly if needed.
        // For now, let's assume a mapping or use a specific function.

        // Simple source resolution based on prefix or explicit mapping would be better.
        // Let's refine UI_ATLAS to include source in frame or structurally.

        // Quick fix: iterate sources to find valid logic or default to a main sprite sheet if combined.
        // Since we split files, we need to know which file a frame belongs to.

        let backgroundImage = '';
        if (sprite.includes('button')) backgroundImage = `url(${UI_ATLAS.sources.buttons})`;
        else if (sprite.includes('panel')) backgroundImage = `url(${UI_ATLAS.sources.panels})`;
        else if (sprite.includes('icon')) backgroundImage = `url(${UI_ATLAS.sources.icons})`;
        else if (sprite.includes('bar')) backgroundImage = `url(${UI_ATLAS.sources.bars})`;

        const style: CSSProperties = {
            backgroundImage,
            backgroundPosition: `-${frame.x}px -${frame.y}px`,
            width: `${frame.w * scale}px`,
            height: `${frame.h * scale}px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            backgroundSize: 'auto', // Important so it doesn't scale the whole image
        };

        return { style, frame };
    }, [sprite, scale]);
}
