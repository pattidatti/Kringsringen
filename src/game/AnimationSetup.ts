import Phaser from 'phaser';

/**
 * Registers all game animations (player, enemies, blood effects).
 * Called from MainScene.create().
 */
export function createAnimations(scene: Phaser.Scene): void {
    scene.anims.create({
        key: 'player-idle',
        frames: scene.anims.generateFrameNumbers('player-idle', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    });

    scene.anims.create({
        key: 'player-walk',
        frames: scene.anims.generateFrameNumbers('player-walk', { start: 0, end: 7 }),
        frameRate: 12,
        repeat: -1
    });

    scene.anims.create({
        key: 'player-attack',
        frames: scene.anims.generateFrameNumbers('player-attack', { start: 0, end: 5 }),
        frameRate: 15,
        repeat: 0
    });

    scene.anims.create({
        key: 'player-bow',
        frames: scene.anims.generateFrameNumbers('player-full', { start: 36, end: 44 }),
        frameRate: 15,
        repeat: 0
    });

    scene.anims.create({
        key: 'orc-walk',
        frames: scene.anims.generateFrameNumbers('orc-walk', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1
    });

    scene.anims.create({
        key: 'orc-attack',
        frames: scene.anims.generateFrameNumbers('orc-attack', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0
    });

    // New Enemy Animations
    scene.anims.create({
        key: 'slime-walk',
        frames: scene.anims.generateFrameNumbers('slime', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: -1
    });

    // Slime sheet: 12 cols × 6 rows = 72 frames. Walk = row 0 (0–5). Attack = second half of row 0 (6–11).
    scene.anims.create({
        key: 'slime-attack',
        frames: scene.anims.generateFrameNumbers('slime', { start: 6, end: 11 }),
        frameRate: 12,
        repeat: 0
    });

    scene.anims.create({
        key: 'skeleton-walk',
        frames: scene.anims.generateFrameNumbers('skeleton', { start: 8, end: 15 }),
        frameRate: 10,
        repeat: -1
    });

    // Skeleton sheet: 8 cols × 7 rows = 56 frames. Walk = row 1 (8–15). Attack = row 2 (16–23).
    scene.anims.create({
        key: 'skeleton-attack',
        frames: scene.anims.generateFrameNumbers('skeleton', { start: 16, end: 23 }),
        frameRate: 10,
        repeat: 0
    });

    scene.anims.create({
        key: 'werewolf-walk',
        frames: scene.anims.generateFrameNumbers('werewolf', { start: 13, end: 25 }),
        frameRate: 12,
        repeat: -1
    });

    // Werewolf sheet: 13 cols × 6 rows = 78 frames. Walk = row 1 (13–25). Attack = row 2 (26–38).
    scene.anims.create({
        key: 'werewolf-attack',
        frames: scene.anims.generateFrameNumbers('werewolf', { start: 26, end: 38 }),
        frameRate: 12,
        repeat: 0
    });

    scene.anims.create({
        key: 'greatsword-walk',
        frames: scene.anims.generateFrameNumbers('greatsword_skeleton', { start: 12, end: 23 }),
        frameRate: 8,
        repeat: -1
    });

    // Greatsword skeleton sheet: 12 cols × 7 rows = 84 frames. Walk = row 1 (12–23). Attack = row 2 (24–35).
    scene.anims.create({
        key: 'greatsword-attack',
        frames: scene.anims.generateFrameNumbers('greatsword_skeleton', { start: 24, end: 35 }),
        frameRate: 8,
        repeat: 0
    });

    // Elite Enemies
    scene.anims.create({
        key: 'armored-skeleton-walk',
        frames: scene.anims.generateFrameNumbers('armored_skeleton', { start: 8, end: 15 }),
        frameRate: 10,
        repeat: -1
    });

    // Armored skeleton sheet: 9 cols × 6 rows = 54 frames. Walk = 8–15. Attack = next 8 frames (16–23).
    scene.anims.create({
        key: 'armored-skeleton-attack',
        frames: scene.anims.generateFrameNumbers('armored_skeleton', { start: 16, end: 23 }),
        frameRate: 10,
        repeat: 0
    });

    scene.anims.create({
        key: 'elite-orc-walk',
        frames: scene.anims.generateFrameNumbers('elite_orc', { start: 8, end: 15 }),
        frameRate: 10,
        repeat: -1
    });

    // Elite orc sheet: 11 cols × 7 rows = 77 frames. Walk = 8–15. Attack = next 8 frames (16–23).
    scene.anims.create({
        key: 'elite-orc-attack',
        frames: scene.anims.generateFrameNumbers('elite_orc', { start: 16, end: 23 }),
        frameRate: 10,
        repeat: 0
    });

    scene.anims.create({
        key: 'armored-orc-walk',
        frames: scene.anims.generateFrameNumbers('armored_orc', { start: 8, end: 15 }),
        frameRate: 10,
        repeat: -1
    });

    // Armored orc sheet: 9 cols × 8 rows = 72 frames. Walk = 8–15. Attack = next 8 frames (16–23).
    scene.anims.create({
        key: 'armored-orc-attack',
        frames: scene.anims.generateFrameNumbers('armored_orc', { start: 16, end: 23 }),
        frameRate: 10,
        repeat: 0
    });

    // Blood Effects
    for (let i = 1; i <= 5; i++) {
        scene.anims.create({
            key: `blood_${i}`,
            frames: scene.anims.generateFrameNumbers(`blood_${i}`, { start: 0, end: 29 }),
            frameRate: 24,
            repeat: 0
        });
    }
}
