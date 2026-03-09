export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface QualitySettings {
    lightingEnabled: boolean;
    particleMultiplier: number;
    hpBarUpdateMode: 'reactive' | 'continuous';
    postFXEnabled: boolean;
    bloomEnabled: boolean;
    /** Max simultaneous PointLights for projectiles (player lights are separate) */
    maxProjectileLights: number;
}

export const QUALITY_CONFIGS: Record<GraphicsQuality, QualitySettings> = {
    low: {
        lightingEnabled: false,
        particleMultiplier: 0.2,
        hpBarUpdateMode: 'reactive',
        postFXEnabled: false,
        bloomEnabled: false,
        maxProjectileLights: 0
    },
    medium: {
        lightingEnabled: true,
        particleMultiplier: 0.6,
        hpBarUpdateMode: 'reactive',
        postFXEnabled: true,
        bloomEnabled: false,
        maxProjectileLights: 6
    },
    high: {
        lightingEnabled: true,
        particleMultiplier: 1.0,
        hpBarUpdateMode: 'continuous',
        postFXEnabled: true,
        bloomEnabled: true,
        maxProjectileLights: 12
    }
};

export const DEFAULT_QUALITY: GraphicsQuality = 'high';

export function getQualityConfig(quality: GraphicsQuality): QualitySettings {
    return QUALITY_CONFIGS[quality] || QUALITY_CONFIGS[DEFAULT_QUALITY];
}
