
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

// Item icon coordinates verified via the sprite-debug grid in FantasyDemo
export const UI_ATLAS = {
    sources: {
        buttons: import.meta.env.BASE_URL + 'assets/ui/UI_Buttons.png',
        panels: import.meta.env.BASE_URL + 'assets/ui/UI_Frames.png',
        icons: import.meta.env.BASE_URL + 'assets/ui/UI_Icons.png',
        bars: import.meta.env.BASE_URL + 'assets/ui/UI_Bars.png',
        items: import.meta.env.BASE_URL + 'assets/ui/fantasy/UI_Item_Icons.png',
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

        // Item Icons (UI_Item_Icons.png) – 32x32px per ikon, col*32=x, row*32=y
        // Confirmed via sprite-debug grid in FantasyDemo
        item_heart_status: { x: 192, y: 0, w: 32, h: 32 }, // col=6 row=0 ✓ (heart icon)
        item_lightning: { x: 256, y: 0, w: 32, h: 32 }, // col=8 row=0 ✓ (lightning bolt)
        item_flame: { x: 288, y: 0, w: 32, h: 32 }, // col=9 row=0 ✓ (fireball)

        item_sword: { x: 32, y: 160, w: 32, h: 32 }, // col=1 row=5 ✓
        item_sword_heavy: { x: 128, y: 160, w: 32, h: 32 }, // col=4 row=5 – verifiser
        item_swords_crossed: { x: 224, y: 160, w: 32, h: 32 }, // col=7 row=5 – verifiser
        item_spear: { x: 288, y: 160, w: 32, h: 32 }, // col=9 row=5 – verifiser

        item_shield: { x: 32, y: 192, w: 32, h: 32 }, // col=1 row=6 ✓
        item_bow: { x: 96, y: 192, w: 32, h: 32 }, // col=3 row=6 ✓

        item_helmet: { x: 32, y: 224, w: 32, h: 32 }, // col=1 row=7 ✓

        item_potion_red: { x: 0, y: 288, w: 32, h: 32 }, // col=0 row=9 ✓

        item_orb_purple: { x: 96, y: 640, w: 32, h: 32 }, // TODO: verifiser

        item_frost_orb: { x: 256, y: 192, w: 32, h: 32 }, // col=8 row=6 ✓

        item_magic_staff: { x: 288, y: 192, w: 32, h: 32 }, // col=9 row=6 ✓

        item_lightning_staff: { x: 352, y: 192, w: 32, h: 32 }, // col=11 row=6 ✓

        item_synergy_rune: { x: 448, y: 160, w: 32, h: 32 }, // col=14 row=5

        item_gold_coin: { x: 224, y: 384, w: 32, h: 32 }, // col=7 row=12 ✓ (Large Gold Coin)
    }
} as const;

export type SpriteKey = keyof typeof UI_ATLAS.frames;
