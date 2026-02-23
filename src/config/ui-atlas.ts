
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
        buttons: import.meta.env.BASE_URL + 'assets/ui/UI_Buttons.png',
        panels:  import.meta.env.BASE_URL + 'assets/ui/UI_Frames.png',
        icons:   import.meta.env.BASE_URL + 'assets/ui/UI_Icons.png',
        bars:    import.meta.env.BASE_URL + 'assets/ui/UI_Bars.png',
        items:   import.meta.env.BASE_URL + 'assets/ui/fantasy/UI_Item_Icons.png',
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
        // MERK: Koordinatar er PLACEHOLDER – bruk sprite-debug i FantasyDemo til å finne riktige!
        item_heart_status:   { x: 128, y: 0,   w: 32, h: 32 }, // TODO: verifiser
        item_lightning:      { x: 192, y: 0,   w: 32, h: 32 }, // TODO: verifiser
        item_flame:          { x: 224, y: 0,   w: 32, h: 32 }, // TODO: verifiser

        item_sword:          { x: 0,   y: 128, w: 32, h: 32 }, // TODO: verifiser
        item_sword_heavy:    { x: 96,  y: 128, w: 32, h: 32 }, // TODO: verifiser
        item_swords_crossed: { x: 192, y: 128, w: 32, h: 32 }, // TODO: verifiser
        item_spear:          { x: 256, y: 128, w: 32, h: 32 }, // TODO: verifiser

        item_shield:         { x: 0,   y: 160, w: 32, h: 32 }, // TODO: verifiser
        item_bow:            { x: 224, y: 160, w: 32, h: 32 }, // TODO: verifiser

        item_helmet:         { x: 0,   y: 192, w: 32, h: 32 }, // TODO: verifiser

        item_potion_red:     { x: 96,  y: 256, w: 32, h: 32 }, // TODO: verifiser

        item_orb_purple:     { x: 96,  y: 640, w: 32, h: 32 }, // TODO: verifiser

        item_magic_staff:    { x: 192, y: 96,  w: 32, h: 32 }, // TODO: verifiser
    }
} as const;

export type SpriteKey = keyof typeof UI_ATLAS.frames;
