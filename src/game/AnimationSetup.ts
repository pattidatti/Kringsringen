import Phaser from 'phaser';

/**
 * Registers all game animations (player, enemies, blood effects).
 * Called from MainScene.create().
 */
export function createAnimations(scene: Phaser.Scene): void {
    const safeAnims = (config: Phaser.Types.Animations.Animation) => {
        const textureKey = config.frames && Array.isArray(config.frames) && config.frames.length > 0
            ? (config.frames[0] as any).texture
            : null;

        if (textureKey && !scene.textures.exists(textureKey)) {
            console.warn(`[AnimationSetup] Skipping animation "${config.key}" - texture "${textureKey}" not found.`);
            return;
        }

        // Final check: generateFrameNumbers might return empty array if config is wrong or texture too small
        try {
            scene.anims.create(config);
        } catch (e) {
            console.error(`[AnimationSetup] Failed to create animation "${config.key}":`, e);
        }
    };

    safeAnims({
        key: 'player-idle',
        frames: scene.anims.generateFrameNumbers('player-idle', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    });

    safeAnims({
        key: 'player-walk',
        frames: scene.anims.generateFrameNumbers('player-walk', { start: 0, end: 7 }),
        frameRate: 12,
        repeat: -1
    });

    safeAnims({
        key: 'player-attack',
        frames: scene.anims.generateFrameNumbers('player-attack', { start: 0, end: 5 }),
        frameRate: 15,
        repeat: 0
    });

    safeAnims({
        key: 'player-attack-2',
        frames: scene.anims.generateFrameNumbers('player-attack-2', { start: 0, end: 5 }),
        frameRate: 15,
        repeat: 0
    });

    safeAnims({
        key: 'player-bow',
        frames: scene.anims.generateFrameNumbers('player-full', { start: 36, end: 44 }),
        frameRate: 15,
        repeat: 0
    });

    // Cast animation (used by frost + lightning). Reuses bow frames until a dedicated
    // cast spritesheet is available. Must exist or animationcomplete never fires → isAttacking stuck.
    safeAnims({
        key: 'player-cast',
        frames: scene.anims.generateFrameNumbers('player-full', { start: 36, end: 44 }),
        frameRate: 18,  // Slightly faster than bow for a snappier feel
        repeat: 0
    });

    safeAnims({
        key: 'orc-walk',
        frames: scene.anims.generateFrameNumbers('orc-walk', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1
    });

    safeAnims({
        key: 'orc-attack',
        frames: scene.anims.generateFrameNumbers('orc-attack', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0
    });

    // New Enemy Animations
    safeAnims({
        key: 'slime-walk',
        frames: scene.anims.generateFrameNumbers('slime', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: -1
    });

    // Slime sheet: 12 cols × 6 rows = 72 frames. Walk = row 0 (0–5). Attack = row 2 (24–35).
    safeAnims({
        key: 'slime-attack',
        frames: scene.anims.generateFrameNumbers('slime', { start: 24, end: 29 }),
        frameRate: 12,
        repeat: 0
    });

    safeAnims({
        key: 'skeleton-walk',
        frames: scene.anims.generateFrameNumbers('skeleton', { start: 8, end: 15 }),
        frameRate: 10,
        repeat: -1
    });

    // Skeleton sheet: 8 cols × 7 rows = 56 frames. Walk = row 1 (8–15). Attack = row 2 (16–23).
    safeAnims({
        key: 'skeleton-attack',
        frames: scene.anims.generateFrameNumbers('skeleton', { start: 16, end: 21 }),
        frameRate: 10,
        repeat: 0
    });

    safeAnims({
        key: 'werewolf-walk',
        frames: scene.anims.generateFrameNumbers('werewolf', { start: 13, end: 20 }),
        frameRate: 12,
        repeat: -1
    });

    // Werewolf sheet: 13 cols × 6 rows = 78 frames. Walk = row 1 (13–25). Attack = row 2 (26–38).
    safeAnims({
        key: 'werewolf-attack',
        frames: scene.anims.generateFrameNumbers('werewolf', { start: 26, end: 34 }),
        frameRate: 12,
        repeat: 0
    });

    safeAnims({
        key: 'greatsword-walk',
        frames: scene.anims.generateFrameNumbers('greatsword_skeleton', { start: 12, end: 20 }),
        frameRate: 8,
        repeat: -1
    });

    // Greatsword skeleton sheet: 12 cols × 7 rows = 84 frames. Walk = row 1 (12–23). Attack = row 2 (24–35).
    safeAnims({
        key: 'greatsword-attack',
        frames: scene.anims.generateFrameNumbers('greatsword_skeleton', { start: 24, end: 32 }),
        frameRate: 8,
        repeat: 0
    });

    // Elite Enemies
    safeAnims({
        key: 'armored-skeleton-walk',
        frames: scene.anims.generateFrameNumbers('armored_skeleton', { start: 9, end: 15 }),
        frameRate: 10,
        repeat: -1
    });

    // Armored skeleton sheet: 9 cols × 6 rows = 54 frames. Attack = row 2 (18–26).
    safeAnims({
        key: 'armored-skeleton-attack',
        frames: scene.anims.generateFrameNumbers('armored_skeleton', { start: 18, end: 25 }),
        frameRate: 10,
        repeat: 0
    });

    safeAnims({
        key: 'elite-orc-walk',
        frames: scene.anims.generateFrameNumbers('elite_orc', { start: 11, end: 18 }),
        frameRate: 10,
        repeat: -1
    });

    // Elite orc sheet: 11 cols × 7 rows = 77 frames. Attack = row 2 (22–32).
    safeAnims({
        key: 'elite-orc-attack',
        frames: scene.anims.generateFrameNumbers('elite_orc', { start: 22, end: 28 }),
        frameRate: 10,
        repeat: 0
    });

    safeAnims({
        key: 'armored-orc-walk',
        frames: scene.anims.generateFrameNumbers('armored_orc', { start: 9, end: 15 }),
        frameRate: 10,
        repeat: -1
    });

    // Armored orc sheet: 9 cols × 8 rows = 72 frames. Attack = row 2 (18–26).
    safeAnims({
        key: 'armored-orc-attack',
        frames: scene.anims.generateFrameNumbers('armored_orc', { start: 18, end: 24 }),
        frameRate: 10,
        repeat: 0
    });

    // Armored orc shockwave: row 4 (frames 36–44), spilles én gang under AOE pushback
    safeAnims({
        key: 'armored-orc-shockwave',
        frames: scene.anims.generateFrameNumbers('armored_orc', { start: 36, end: 44 }),
        frameRate: 10,
        repeat: 0
    });

    // Ranged Enemy Animations
    // Wizard - Walk (row 1: 15-22), Attack (row 2: 30-41)
    safeAnims({
        key: 'wizard-walk',
        frames: scene.anims.generateFrameNumbers('wizard', { start: 15, end: 22 }),
        frameRate: 10,
        repeat: -1
    });
    safeAnims({
        key: 'wizard-attack',
        frames: scene.anims.generateFrameNumbers('wizard', { start: 30, end: 41 }),
        frameRate: 12,
        repeat: 0
    });

    // Skeleton Archer - Walk (row 1: 9-16), Attack (row 2: 18-26)
    safeAnims({
        key: 'skeleton-archer-walk',
        frames: scene.anims.generateFrameNumbers('skeleton_archer', { start: 9, end: 16 }),
        frameRate: 10,
        repeat: -1
    });
    safeAnims({
        key: 'skeleton-archer-attack',
        frames: scene.anims.generateFrameNumbers('skeleton_archer', { start: 18, end: 26 }),
        frameRate: 12,
        repeat: 0
    });

    // Wizard Fireball Projectile
    safeAnims({
        key: 'wizard-fireball-fly',
        frames: scene.anims.generateFrameNumbers('wizard_fireball', { start: 0, end: 9 }),
        frameRate: 12,
        repeat: -1
    });

    // Blood Effects
    for (let i = 1; i <= 5; i++) {
        safeAnims({
            key: `blood_${i}`,
            frames: scene.anims.generateFrameNumbers(`blood_${i}`, { start: 0, end: 29 }),
            frameRate: 24,
            repeat: 0
        });
    }

    // Fireball: 640×576 @ 64×64 → 10 cols × 9 rows. Row 0 = frames 0–9
    safeAnims({
        key: 'fireball-fly',
        frames: scene.anims.generateFrameNumbers('fireball_projectile', { start: 0, end: 9 }),
        frameRate: 12,
        repeat: -1
    });

    // Explosion: 512×576 @ 64×64 → 8 cols × 9 rows. Row 0 = frames 0–7
    safeAnims({
        key: 'fireball-explode',
        frames: scene.anims.generateFrameNumbers('fireball_explosion', { start: 0, end: 7 }),
        frameRate: 14,
        repeat: 0
    });

    // Frost projectile: 512×576 @ 64×64 → 8 cols × 9 rows. Row 2 (cyan) = frames 16–23
    safeAnims({
        key: 'frost-fly',
        frames: scene.anims.generateFrameNumbers('frost_projectile', { start: 16, end: 23 }),
        frameRate: 12,
        repeat: -1
    });

    // Frost explosion: 576×576 @ 64×64 → 9 cols × 9 rows. Row 2 (cyan) = frames 18–26
    safeAnims({
        key: 'frost-explode',
        frames: scene.anims.generateFrameNumbers('frost_explosion', { start: 18, end: 26 }),
        frameRate: 14,
        repeat: 0
    });

    // Lightning projectiles: 896x576 @ 64x64 -> 14 cols x 9 rows.
    safeAnims({
        key: 'lightning-fly-blue', // Row 4 = frames 56-61
        frames: scene.anims.generateFrameNumbers('lightning_projectile', { start: 56, end: 61 }),
        frameRate: 12,
        repeat: -1
    });

    safeAnims({
        key: 'lightning-fly-white', // Row 7 = frames 98-103
        frames: scene.anims.generateFrameNumbers('lightning_projectile', { start: 98, end: 103 }),
        frameRate: 12,
        repeat: -1
    });

    // Lightning impact: 896x576 @ 64x64 -> 14 cols x 9 rows. Row 7 = frames 98-103
    safeAnims({
        key: 'lightning-impact',
        frames: scene.anims.generateFrameNumbers('lightning_impact', { start: 98, end: 103 }),
        frameRate: 14,
        repeat: 0
    });
}
