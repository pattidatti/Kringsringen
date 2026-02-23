import Phaser from 'phaser';
import { FantasyAssetManifest } from './FantasyAssetManifest';
import { AudioManager } from './AudioManager';

/**
 * Loads all game assets (spritesheets, images, atlases, audio).
 * Called from MainScene.preload().
 */
export function loadAssets(scene: Phaser.Scene): void {
    // Player Sprites
    scene.load.spritesheet('player-idle', 'assets/sprites/soldier/Soldier-Idle.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.spritesheet('player-walk', 'assets/sprites/soldier/Soldier-Walk.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.spritesheet('player-attack', 'assets/sprites/soldier/Soldier-Attack01.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.spritesheet('player-full', 'assets/sprites/soldier/Soldier.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.image('arrow', 'assets/sprites/projectile/arrow.png');

    // Orc
    scene.load.spritesheet('orc-idle', 'assets/sprites/orc/Orc-Idle.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.spritesheet('orc-walk', 'assets/sprites/orc/Orc-Walk.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.spritesheet('orc-attack', 'assets/sprites/orc/Orc-Attack01.png', { frameWidth: 100, frameHeight: 100 });

    // New Enemies - Loading as 100x100 Spritesheets (Full Sheets)
    scene.load.spritesheet('slime', 'assets/sprites/slime.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.spritesheet('skeleton', 'assets/sprites/skeleton.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.spritesheet('greatsword_skeleton', 'assets/sprites/greatsword_skeleton.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.spritesheet('werewolf', 'assets/sprites/werewolf.png', { frameWidth: 100, frameHeight: 100 });

    // Elite Variants
    scene.load.spritesheet('armored_skeleton', 'assets/sprites/armored_skeleton.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.spritesheet('elite_orc', 'assets/sprites/elite_orc.png', { frameWidth: 100, frameHeight: 100 });
    scene.load.spritesheet('armored_orc', 'assets/sprites/armored_orc.png', { frameWidth: 100, frameHeight: 100 });

    // Fantasy Tileset Assets
    scene.load.spritesheet('fantasy-ground', 'assets/fantasy/Art/Ground Tileset/Tileset_Ground.png', { frameWidth: 16, frameHeight: 16 });
    scene.load.spritesheet('fantasy-road', 'assets/fantasy/Art/Ground Tileset/Tileset_Road.png', { frameWidth: 16, frameHeight: 16 });

    // Load all assets from manifest
    FantasyAssetManifest.forEach(asset => {
        scene.load.image(asset.id, asset.path);
    });

    // Atlases
    scene.load.spritesheet('fantasy-props-atlas', 'assets/fantasy/Art/Props/Atlas/Props.png', { frameWidth: 16, frameHeight: 16 });
    scene.load.spritesheet('fantasy-trees-atlas', 'assets/fantasy/Art/Trees and Bushes/Atlas/Trees_Bushes.png', { frameWidth: 16, frameHeight: 16 });

    // Map Assets
    scene.load.image('tiles-grass', 'assets/textures/TX Tileset Grass.png');
    scene.load.image('tiles-stone', 'assets/textures/TX Tileset Stone Ground.png');
    scene.load.spritesheet('props', 'assets/textures/TX Props.png', { frameWidth: 32, frameHeight: 32 });
    scene.load.spritesheet('plants', 'assets/textures/TX Plant.png', { frameWidth: 32, frameHeight: 32 });
    scene.load.spritesheet('struct', 'assets/textures/TX Struct.png', { frameWidth: 32, frameHeight: 32 });
    scene.load.spritesheet('shadows', 'assets/textures/TX Shadow.png', { frameWidth: 32, frameHeight: 32 });
    scene.load.spritesheet('shadows-plant', 'assets/textures/TX Shadow Plant.png', { frameWidth: 32, frameHeight: 32 });

    // Blood Effects
    for (let i = 1; i <= 5; i++) {
        scene.load.spritesheet(`blood_${i}`, `assets/sprites/effects/blood/blood_${i}.png`, { frameWidth: 100, frameHeight: 100 });
    }

    // Fireball Spell
    scene.load.spritesheet('fireball_projectile', 'assets/sprites/effects/fireball_projectile.png', { frameWidth: 64, frameHeight: 64 });
    scene.load.spritesheet('fireball_explosion',  'assets/sprites/effects/fireball_explosion.png',  { frameWidth: 64, frameHeight: 64 });

    // Preload Audio
    AudioManager.instance.preload(scene);
}
