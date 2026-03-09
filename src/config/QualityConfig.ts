export type GraphicsQuality = 'low' | 'medium' | 'high';

export type ShadowMode = 'blob' | 'silhouette' | 'dynamic';

export interface QualitySettings {
    lightingEnabled: boolean;
    particleMultiplier: number;
    hpBarUpdateMode: 'reactive' | 'continuous';
    postFXEnabled: boolean;
    bloomEnabled: boolean;
    /** Max simultaneous PointLights for projectiles (player lights are separate) */
    maxProjectileLights: number;
    /** Shadow rendering mode: blob (oval), silhouette (sprite shape), dynamic (light-reactive) */
    shadowMode: ShadowMode;
}

export const QUALITY_CONFIGS: Record<GraphicsQuality, QualitySettings> = {
    low: {
        lightingEnabled: false,
        particleMultiplier: 0.2,
        hpBarUpdateMode: 'reactive',
        postFXEnabled: false,
        bloomEnabled: false,
        maxProjectileLights: 0,
        shadowMode: 'blob'
    },
    medium: {
        lightingEnabled: true,
        particleMultiplier: 0.6,
        hpBarUpdateMode: 'reactive',
        postFXEnabled: true,
        bloomEnabled: false,
        maxProjectileLights: 6,
        shadowMode: 'silhouette'
    },
    high: {
        lightingEnabled: true,
        particleMultiplier: 1.0,
        hpBarUpdateMode: 'continuous',
        postFXEnabled: true,
        bloomEnabled: true,
        maxProjectileLights: 12,
        shadowMode: 'dynamic'
    }
};

export const DEFAULT_QUALITY: GraphicsQuality = 'high';

export function getQualityConfig(quality: GraphicsQuality): QualitySettings {
    return QUALITY_CONFIGS[quality] || QUALITY_CONFIGS[DEFAULT_QUALITY];
}
