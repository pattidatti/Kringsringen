
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
        buttons: '/assets/ui/UI_Buttons.png',
        panels: '/assets/ui/UI_Frames.png',
        icons: '/assets/ui/UI_Icons.png',
        bars: '/assets/ui/UI_Bars.png',
        items: '/assets/ui/fantasy/UI_Item_Icons.png',
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

        // Item Icons (UI_Item_Icons.png) – 16x16 per celle, ingen padding
        // Koordinatar: col * 16, row * 16 (0-indeksert)
        // Rad 0 (y=0): Status-ikoner
        item_heart_status:   { x: 64,  y: 0,   w: 16, h: 16 }, // r0c4 – rosa hjerte (Karakter)
        item_lightning:      { x: 96,  y: 0,   w: 16, h: 16 }, // r0c6 – lyn (fart)
        item_flame:          { x: 112, y: 0,   w: 16, h: 16 }, // r0c7 – flamme

        // Rad 4 (y=64): Tynne sverd / lansjar
        item_sword:          { x: 0,   y: 64,  w: 16, h: 16 }, // r4c0 – sverd
        item_sword_heavy:    { x: 48,  y: 64,  w: 16, h: 16 }, // r4c3 – tyngre sverd (knockback)
        item_swords_crossed: { x: 96,  y: 64,  w: 16, h: 16 }, // r4c6 – kryssa sverd (angrepsfart)
        item_spear:          { x: 128, y: 64,  w: 16, h: 16 }, // r4c8 – spyd (gjennomboring)

        // Rad 5 (y=80): Skjold + tyngre våpen + bumerang
        item_shield:         { x: 0,   y: 80,  w: 16, h: 16 }, // r5c0 – rundt skjold (rustning)
        item_bow:            { x: 112, y: 80,  w: 16, h: 16 }, // r5c7 – bue (flytta til høgre)

        // Rad 6 (y=96): Rustning
        item_helmet:         { x: 0,   y: 96,  w: 16, h: 16 }, // r6c0 – hjelm

        // Rad 8 (y=128): Potions
        item_potion_red:     { x: 48,  y: 128, w: 16, h: 16 }, // r8c3 – raud potion (regen)

        // Rad 20 (y=320): Orber
        item_orb_purple:     { x: 48,  y: 320, w: 16, h: 16 }, // r20c3 – lilla orb (Magi/ild)

        // Rad 3 (y=48): Skills – magisstav
        item_magic_staff:    { x: 96,  y: 48,  w: 16, h: 16 }, // r3c6 – magisk stav
    }
} as const;

export type SpriteKey = keyof typeof UI_ATLAS.frames;
