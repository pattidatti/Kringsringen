import { FantasyAssetManifest } from './FantasyAssetManifest';
import { AUDIO_MANIFEST } from './AudioManifest';

/** Base path for all public assets. */
const BASE = import.meta.env.BASE_URL;

/**
 * All image/spritesheet URLs used by AssetLoader.ts.
 * This list is the single source of truth consumed by:
 *   1. AssetLoader.ts   — to register assets with Phaser
 *   2. useGameAssetPreloader — to warm the browser cache before Phaser boots
 */
export const GAME_IMAGE_URLS: string[] = [
    // Player
    `${BASE}assets/sprites/soldier/Soldier-Idle.png`,
    `${BASE}assets/sprites/soldier/Soldier-Walk.png`,
    `${BASE}assets/sprites/soldier/Soldier-Attack01.png`,
    `${BASE}assets/sprites/soldier/Soldier-Attack02.png`,
    `${BASE}assets/sprites/soldier/Soldier.png`,
    `${BASE}assets/sprites/projectile/arrow.png`,

    // Enemies
    `${BASE}assets/sprites/orc/Orc-Idle.png`,
    `${BASE}assets/sprites/orc/Orc-Walk.png`,
    `${BASE}assets/sprites/orc/Orc-Attack01.png`,
    `${BASE}assets/sprites/slime.png`,
    `${BASE}assets/sprites/skeleton.png`,
    `${BASE}assets/sprites/greatsword_skeleton.png`,
    `${BASE}assets/sprites/werewolf.png`,

    // Elite Variants
    `${BASE}assets/sprites/armored_skeleton.png`,
    `${BASE}assets/sprites/elite_orc.png`,
    `${BASE}assets/sprites/armored_orc.png`,

    // Ranged Enemies
    `${BASE}assets/sprites/wizard.png`,
    `${BASE}assets/sprites/skeleton_archer.png`,
    `${BASE}assets/sprites/effects/wizard_fireball.png`,
    `${BASE}assets/sprites/effects/heal_effect.png`,

    // Tilesets
    `${BASE}assets/fantasy/Art/Ground Tileset/Tileset_Ground.png`,
    `${BASE}assets/fantasy/Art/Ground Tileset/Tileset_Road.png`,

    // Atlases
    `${BASE}assets/fantasy/Art/Props/Atlas/Props.png`,
    `${BASE}assets/fantasy/Art/Trees and Bushes/Atlas/Trees_Bushes.png`,

    // Map Assets
    `${BASE}assets/textures/TX Tileset Grass.png`,
    `${BASE}assets/textures/TX Tileset Stone Ground.png`,
    `${BASE}assets/textures/TX Props.png`,
    `${BASE}assets/textures/TX Plant.png`,
    `${BASE}assets/textures/TX Struct.png`,
    `${BASE}assets/textures/TX Shadow.png`,
    `${BASE}assets/textures/TX Shadow Plant.png`,

    // Blood Effects
    ...Array.from({ length: 5 }, (_, i) => `${BASE}assets/sprites/effects/blood/blood_${i + 1}.png`),

    // Spell Effects
    `${BASE}assets/sprites/effects/fireball_projectile.png`,
    `${BASE}assets/sprites/effects/fireball_explosion.png`,
    `${BASE}assets/sprites/effects/frost_projectile.png`,
    `${BASE}assets/sprites/effects/frost_explosion.png`,
    `${BASE}assets/sprites/effects/lightning_projectile.png`,
    `${BASE}assets/sprites/effects/lightning_impact.png`,
    `${BASE}assets/sprites/effects/dash_effect.png`,

    // Fantasy Asset Manifest (buildings, props, trees, etc.)
    ...FantasyAssetManifest.map(a => `${BASE}${a.path}`),
];

/**
 * All audio URLs that are NOT marked lazyLoad in AudioManifest.
 * BGM tracks are lazy-loaded by AudioManager, so they are excluded here.
 */
export const GAME_AUDIO_URLS: string[] = AUDIO_MANIFEST
    .filter(c => !c.lazyLoad)
    .flatMap(c => {
        if (c.path) return [`${BASE}${c.path}`];
        if (c.variants) return c.variants.map(v => `${BASE}${v}`);
        return [];
    });
