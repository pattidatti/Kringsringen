/**
 * Reusable Framer Motion animation variants for UI components
 */

export const fadeInUp = {
    initial: { opacity: 0, y: 5 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 5 }
};

export const fadeScale = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
};

export const bounceScale = {
    initial: { scale: 0.8 },
    animate: {
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 15
        }
    }
};

export const pulseGlow = {
    animate: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
};

/**
 * Lightning burst animation for dash charge consumption
 */
export const lightningBurst = {
    initial: { scale: 1, opacity: 1 },
    exit: {
        scale: 2,
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: "easeOut"
        }
    }
};

/**
 * Shimmer effect for ability ready state
 */
export const shimmer = {
    animate: {
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "linear"
        }
    }
};

/**
 * Note gain animation for verse indicator
 */
export const noteGain = {
    initial: { scale: 0, rotate: -45 },
    animate: {
        scale: 1,
        rotate: 0,
        transition: {
            type: "spring",
            stiffness: 500,
            damping: 20
        }
    }
};
