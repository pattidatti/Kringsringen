export interface EnemyConfig {
    id: string;
    name: string;
    spriteInfo: {
        type: 'spritesheet' | 'image';
        texture: string;
        anims?: {
            idle?: string;
            walk: string;
            attack?: string;
        };
    };
    baseHP: number;
    baseSpeed: number;
    baseDamage: number;
    xpValue: number;
    scale: number;
    bodySize: { width: number, height: number };
    knockbackResistance: number; // 0 = full knockback, 1 = immovable
    attackDamageFrame?: number; // Which animation frame triggers damage (defaults to 3)
}

export const ENEMY_TYPES: Record<string, EnemyConfig> = {
    orc: {
        id: 'orc',
        name: 'Orc',
        spriteInfo: {
            type: 'spritesheet',
            texture: 'orc-idle',
            anims: {
                idle: 'orc-idle',
                walk: 'orc-walk',
                attack: 'orc-attack'
            }
        },
        baseHP: 50,
        baseSpeed: 100,
        baseDamage: 10,
        xpValue: 10,
        scale: 2,
        bodySize: { width: 20, height: 15 },
        knockbackResistance: 0
    },
    slime: {
        id: 'slime',
        name: 'Slime',
        spriteInfo: {
            type: 'spritesheet',
            texture: 'slime',
            anims: {
                walk: 'slime-walk',
                attack: 'slime-attack'
            }
        },
        baseHP: 30,
        baseSpeed: 80,
        baseDamage: 5,
        xpValue: 5,
        scale: 1.5,
        bodySize: { width: 32, height: 24 }, // Adjusted for 100x100 frame content
        knockbackResistance: 0.2,
        attackDamageFrame: 5 // 12-frame animation (row 2), damage at ~40%
    },
    skeleton: {
        id: 'skeleton',
        name: 'Skeleton',
        spriteInfo: {
            type: 'spritesheet',
            texture: 'skeleton',
            anims: {
                walk: 'skeleton-walk',
                attack: 'skeleton-attack'
            }
        },
        baseHP: 40,
        baseSpeed: 110,
        baseDamage: 15,
        xpValue: 12,
        scale: 1.8,
        bodySize: { width: 24, height: 40 }, // Adjusted
        knockbackResistance: 0.1,
        attackDamageFrame: 4 // 8-frame animation, damage at ~50%
    },
    werewolf: {
        id: 'werewolf',
        name: 'Werewolf',
        spriteInfo: {
            type: 'spritesheet',
            texture: 'werewolf',
            anims: {
                walk: 'werewolf-walk',
                attack: 'werewolf-attack'
            }
        },
        baseHP: 120,
        baseSpeed: 160,
        baseDamage: 25,
        xpValue: 30,
        scale: 2.2,
        bodySize: { width: 40, height: 60 }, // Adjusted
        knockbackResistance: 0.5,
        attackDamageFrame: 7 // 13-frame animation, damage at ~54%
    },
    greatsword_skeleton: {
        id: 'greatsword_skeleton',
        name: 'Elite Skeleton',
        spriteInfo: {
            type: 'spritesheet',
            texture: 'greatsword_skeleton',
            anims: {
                walk: 'greatsword-walk',
                attack: 'greatsword-attack'
            }
        },
        baseHP: 200,
        baseSpeed: 90,
        baseDamage: 40,
        xpValue: 50,
        scale: 2.5,
        bodySize: { width: 50, height: 80 },
        knockbackResistance: 0.8,
        attackDamageFrame: 6 // 12-frame animation, damage at 50%
    },
    armored_skeleton: {
        id: 'armored_skeleton',
        name: 'Armored Skeleton',
        spriteInfo: {
            type: 'spritesheet',
            texture: 'armored_skeleton',
            anims: {
                walk: 'armored-skeleton-walk',
                attack: 'armored-skeleton-attack'
            }
        },
        baseHP: 150,
        baseSpeed: 100,
        baseDamage: 30,
        xpValue: 35,
        scale: 2.0,
        bodySize: { width: 40, height: 60 },
        knockbackResistance: 0.6,
        attackDamageFrame: 4 // 9-frame animation (row 2)
    },
    elite_orc: {
        id: 'elite_orc',
        name: 'Elite Orc',
        spriteInfo: {
            type: 'spritesheet',
            texture: 'elite_orc',
            anims: {
                walk: 'elite-orc-walk',
                attack: 'elite-orc-attack'
            }
        },
        baseHP: 300,
        baseSpeed: 110,
        baseDamage: 50,
        xpValue: 70,
        scale: 2.2,
        bodySize: { width: 50, height: 60 },
        knockbackResistance: 0.7,
        attackDamageFrame: 5 // 11-frame animation (row 2)
    },
    armored_orc: {
        id: 'armored_orc',
        name: 'Armored Orc',
        spriteInfo: {
            type: 'spritesheet',
            texture: 'armored_orc',
            anims: {
                walk: 'armored-orc-walk',
                attack: 'armored-orc-attack'
            }
        },
        baseHP: 250,
        baseSpeed: 80,
        baseDamage: 45,
        xpValue: 60,
        scale: 2.1,
        bodySize: { width: 45, height: 65 },
        knockbackResistance: 0.9,
        attackDamageFrame: 4 // 9-frame animation (row 2)
    }
};
