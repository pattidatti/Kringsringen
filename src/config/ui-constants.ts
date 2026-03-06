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

    // Responsive breakpoints
    BREAKPOINTS: {
        MOBILE: 400 // px
    }
} as const;
