
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

        // Panels - Grid seems to be 48x48
        panel_wood: { x: 0, y: 0, w: 48, h: 48, slice: 16 }, // Row 0: Tan/Light Wood
        panel_stone: { x: 0, y: 48, w: 48, h: 48, slice: 16 }, // Row 1: Stone/Grey
        panel_green: { x: 0, y: 96, w: 48, h: 48, slice: 16 }, // Row 2: Green
        panel_blue: { x: 0, y: 144, w: 48, h: 48, slice: 16 }, // Row 3: Blue
        panel_gold: { x: 0, y: 192, w: 48, h: 48, slice: 16 }, // Row 4: Orange/Gold (Rich Wood?)
        panel_red: { x: 0, y: 240, w: 48, h: 48, slice: 16 }, // Row 5: Red
        panel_purple: { x: 0, y: 288, w: 48, h: 48, slice: 16 }, // Row 6: Purple

        // Icons (Assuming 16x16 grid)
        icon_sword: { x: 0, y: 0, w: 16, h: 16 },
        icon_shield: { x: 16, y: 0, w: 16, h: 16 },
        icon_heart: { x: 32, y: 0, w: 16, h: 16 },
        icon_coin: { x: 48, y: 0, w: 16, h: 16 },

        // Bars
        bar_health_frame: { x: 192, y: 6, w: 48, h: 19, slice: 5 }, // Verified
        bar_health_fill: { x: 0, y: 16, w: 64, h: 16 }, // Placeholder, kept for now or update if needed
    }
} as const;

export type SpriteKey = keyof typeof UI_ATLAS.frames;
