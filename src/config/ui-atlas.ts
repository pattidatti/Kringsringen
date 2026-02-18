
export interface SpriteFrame {
    x: number;
    y: number;
    w: number;
    h: number;
    slice?: number; // 9-slice border size
}

export interface SpriteAnimation {
    frames: SpriteFrame[];
    duration: number; // ms per frame
}

// These coordinates are placeholders and need to be verified against the actual PNGs
// You might need to open the PNGs in an image editor to get exact pixel values
export const UI_ATLAS = {
    sources: {
        buttons: '/src/assets/ui/UI_Buttons.png',
        panels: '/src/assets/ui/UI_Frames.png',
        icons: '/src/assets/ui/UI_Icons.png',
        bars: '/src/assets/ui/UI_Bars.png',
    },
    frames: {
        // Buttons (Example layout: Normal, Hover, Pressed in vertical stack)
        button_primary_normal: { x: 0, y: 0, w: 48, h: 16 },
        button_primary_hover: { x: 0, y: 16, w: 48, h: 16 },
        button_primary_pressed: { x: 0, y: 32, w: 48, h: 16 },

        // Panels
        panel_wood: { x: 0, y: 0, w: 48, h: 48, slice: 16 }, // Assuming 48x48 9-slice
        panel_paper: { x: 48, y: 0, w: 48, h: 48, slice: 16 },

        // Icons (Assuming 16x16 grid)
        icon_sword: { x: 0, y: 0, w: 16, h: 16 },
        icon_shield: { x: 16, y: 0, w: 16, h: 16 },
        icon_heart: { x: 32, y: 0, w: 16, h: 16 },
        icon_coin: { x: 48, y: 0, w: 16, h: 16 },

        // Bars
        bar_health_frame: { x: 0, y: 0, w: 64, h: 16 },
        bar_health_fill: { x: 0, y: 16, w: 64, h: 16 },
    }
} as const;

export type SpriteKey = keyof typeof UI_ATLAS.frames;
