/**
 * UI configuration constants for consistent styling across components
 */

export const UI_CONSTANTS = {
    // Verse Indicator
    VERSE: {
        NOTE_SIZE: {
            MOBILE: '32px',
            DESKTOP: '48px'
        },
        NOTE_GAP: '0.5rem',
        COLORS: {
            FILLED: '#FFD700',
            FILLED_SECONDARY: '#FFA500',
            EMPTY: '#1a1a1a',
            GLOW: 'rgba(255, 215, 0, 0.8)'
        },
        ANIMATION_DURATION: 0.3
    },

    // Dash Indicator
    DASH: {
        BAR_WIDTH: '160px',
        BAR_HEIGHT: '10px',
        CHARGE_SIZE: '16px',
        CHARGE_GAP: '0.5rem',
        COLORS: {
            AVAILABLE: '#22d3ee',
            UNAVAILABLE: '#1a1a1a',
            BAR_GRADIENT_START: '#1e40af',
            BAR_GRADIENT_END: '#22d3ee',
            GLOW: 'rgba(34, 211, 238, 0.8)'
        },
        KEYBIND_LABEL: 'SHIFT',
        ANIMATION_DURATION: 0.2
    },

    // Buff Display System
    BUFF_DISPLAY: {
        POSITION: {
            TOP: '4.5rem',      // Below TopHUD HP bar
            LEFT: '1rem',       // Safe zone (left side)
            MAX_WIDTH: '220px'  // Constrain width to avoid overlap
        },
        FONT_SIZES: {
            TITLE: '12px',           // text-xs
            DESCRIPTION: '11px',     // text-[11px]
            STATS: '10px',           // text-[10px]
            SECTION_HEADER: '10px'   // text-[10px]
        },
        COMPACT_THRESHOLD: {
            COMBAT: 3,    // Switch to grid mode if > 3 buffs
            PASSIVE: 1,   // Always compact
            ULTIMATE: 999 // Never compact
        },
        Z_INDEX: 50,
        GRID_COLUMNS: 3
    },

    // Responsive breakpoints
    BREAKPOINTS: {
        MOBILE: 400 // px
    }
} as const;
