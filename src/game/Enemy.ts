import Phaser from 'phaser';
import { ENEMY_TYPES, type EnemyConfig } from '../config/enemies';
import { GAME_CONFIG, type EnemyType, type EnemyStats } from '../config/GameConfig';
import type { IMainScene } from './IMainScene';
import { JitterBuffer } from '../network/JitterBuffer';
import type { PackedEnemy } from '../network/SyncSchemas';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private targetStart: Phaser.GameObjects.Components.Transform; // Renamed to avoid confusion with internal target
    public hp: number = 50;
    public maxHP: number = 50;
    protected hpBar: Phaser.GameObjects.Graphics;
    protected isDead: boolean = false;
    private lastDrawnHP: number = -1;
    private lastDrawnMaxHP: number = -1;
    private lastDrawnScale: number = -1;
    private attackRange: number = 60;
    private attackCooldown: number = 1500;
    private currentAbilityCooldown: number = 1500;
    private lastAttackTime: number = 0;
    protected isAttacking: boolean = false;
    public hasHit: boolean = false;
    private readonly DEFAULT_DAMAGE_FRAME: number = 3; // Fallback frame where damage occurs
    public isOnDamageFrame: boolean = false;
    public isPushingBack: boolean = false;
    public linkedEnemy: Enemy | null = null;
    protected movementSpeed: number = 100;
    private enemyType: string = 'orc';
    private config: EnemyConfig;
    private slowTimer: Phaser.Time.TimerEvent | null = null;
    private poisonTimer: Phaser.Time.TimerEvent | null = null;
    private isPoisoned: boolean = false;
    protected originalSpeed: number = 100;
    private shadow: Phaser.GameObjects.Sprite | null = null;
    public id: string = "";
    private attackLight: Phaser.GameObjects.Light | null = null;
    public isStunned: boolean = false;
    private stunTimer: Phaser.Time.TimerEvent | null = null;

    // Predictive Death (Client-side)
    private predictedDeadUntil: number = 0;
    private predictedHP: number = 0;

    /** When true this enemy is a client-side puppet — no AI, no damage, no physics body active. */
    private isClientMode: boolean = false;

    /** History buffer for Lag Compensation (Host only). Stores [timestamp, x, y] tuples. */
    public positionHistory: [number, number, number][] = [];

    private stuckTimer: number = 0;
    private recoveryTimer: number = 0;
    private recoveryAngle: number = 0;

    /** Jitter buffer for smooth interpolation (Client only). */
    private jitterBuffer: JitterBuffer<PackedEnemy> | null = null;

    // Static Buffers for AI (GC Hardening)
    private static readonly NUM_RAYS = 16;
    private static readonly INTEREST_BUFFER = new Array(Enemy.NUM_RAYS).fill(0);
    private static readonly DANGER_BUFFER = new Array(Enemy.NUM_RAYS).fill(0);

    protected isSpecialMovementActive: boolean = false;

    public get damage(): number {
        return this.config.baseDamage; // Will be updated in reset
    }

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.GameObjects.Components.Transform, multiplier: number = 1.0, type: string = 'orc') {
        super(scene, x, y, 'orc-idle'); // Default texture, will be set in reset

        // Temporary init to satisfy TS, real init happens in reset() or if created via new (legacy support)
        this.targetStart = target;
        this.config = ENEMY_TYPES['orc'];

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.hpBar = scene.add.graphics();
        this.shadow = scene.add.sprite(x, y, 'shadows', 0)
            .setAlpha(0.4)
            .setDepth(-1);

        // If called with new(), we should initialize. If pooled, reset() will be called.
        // For now, we assume this might be called directly or via pool.
        // Best practice for Phaser pooling: Constructor does minimal setup, Spawn/Reset does logic.

        this.reset(x, y, target, multiplier, type);
    }

    public reset(x: number, y: number, target: Phaser.GameObjects.Components.Transform, multiplier: number = 1.0, type: string = 'orc') {
        this.id = `${type}-${Phaser.Math.RND.uuid()}`;
        this.setActive(true);
        this.setVisible(true);
        // Always re-enable physics on reset; setClientMode() will disable it again if needed
        this.isClientMode = false;
        this.body!.enable = true;
        this.setPosition(x, y);
        this.setAlpha(1);
        this.setTint(0xffffff);
        if (this.shadow) {
            this.shadow.setVisible(true);
            this.shadow.setPosition(x, y);
        }
        this.clearTint();
        this.postFX.clear();
        if (this.poisonTimer) { this.poisonTimer.remove(false); this.poisonTimer = null; }
        this.isPoisoned = false;
        this.setRotation(0);
        this.removeAllListeners('dead');

        this.targetStart = target;
        this.enemyType = type;
        this.config = ENEMY_TYPES[type] || ENEMY_TYPES['orc'];

        // Get Balance Config from GameConfig
        const configKey = type.toUpperCase() as EnemyType;
        const balanceStats = GAME_CONFIG.ENEMIES[configKey] || GAME_CONFIG.ENEMIES.ORC;

        // Apply Stats
        this.maxHP = Math.floor(balanceStats.baseHP * multiplier);
        this.hp = this.maxHP;
        this.movementSpeed = balanceStats.baseSpeed * (1 + (multiplier - 1) * 0.1); // Slightly less scaling on speed
        this.attackRange = balanceStats.attackRange;
        this.attackCooldown = balanceStats.attackCooldown;
        this.currentAbilityCooldown = this.rollAbilityCooldown();

        // Physics & Scale
        this.setScale(balanceStats.scale);
        this.setBodySize(balanceStats.bodySize.width, balanceStats.bodySize.height, true);
        const offsetY = (this.height * 0.5) - (balanceStats.bodySize.height * 0.5);
        this.setOffset(this.body!.offset.x, offsetY + 10);
        this.setDrag(0);

        // State Flags
        this.isDead = false;
        this.isAttacking = false;
        this.hasHit = false;
        this.isPushingBack = false;
        this.isOnDamageFrame = false;
        this.lastAttackTime = 0;
        this.lastAIUpdate = 0;
        this.lastDrawnHP = -1;
        this.lastDrawnMaxHP = -1;
        this.lastDrawnScale = -1;

        this.predictedDeadUntil = 0;
        this.predictedHP = this.hp;

        this.stuckTimer = 0;
        this.recoveryTimer = 0;
        this.recoveryAngle = 0;

        // Clear Soul Link
        this.linkedEnemy = null;

        // Clear slow state
        if (this.stunTimer) {
            this.stunTimer.remove();
            this.stunTimer = null;
        }
        this.isStunned = false;
        this.originalSpeed = this.movementSpeed;
        this.positionHistory = [];

        // Animation
        this.setTexture(this.config.spriteInfo.texture);
        if (this.config.spriteInfo.type === 'spritesheet' && this.config.spriteInfo.anims) {
            this.play(this.config.spriteInfo.anims.walk);
        }
        if ((this.scene as any).quality?.lightingEnabled) {
            this.setPipeline('Light2D');
        } else {
            this.resetPipeline();
        }

        // Animation Listeners (Clean previous listeners to avoid duplicates if not careful, 
        // but Phaser usually handles 'on' by adding. We should check if listener exists or just use internal flags)
        // Better: Define one-time listeners in constructor, but their logic needs to check current state.

        // Reset HP Bar
        this.updateHPBar();

        // Visual Refinement: Data-driven permanent tint
        if (this.config.tint !== undefined) {
            this.setTint(this.config.tint);
        }
    }

    public getIsDead(): boolean {
        return this.isDead;
    }

    private rollAbilityCooldown(): number {
        const configKey = this.enemyType.toUpperCase() as EnemyType;
        const stats = GAME_CONFIG.ENEMIES[configKey] as unknown as EnemyStats;
        if (stats?.abilityCooldownMin !== undefined && stats?.abilityCooldownMax !== undefined) {
            return Phaser.Math.Between(stats.abilityCooldownMin, stats.abilityCooldownMax);
        }
        return this.attackCooldown;
    }

    private lastAIUpdate: number = 0;
    private readonly AI_UPDATE_INTERVAL: number = 100;

    preUpdate(time: number, delta: number) {
        // Pooling Check
        if (!this.active) return;

        super.preUpdate(time, delta);

        // CLIENT PUPPET MODE: rendering from JitterBuffer, predicting hits
        if (this.isClientMode) {
            if (this.predictedDeadUntil > Date.now()) {
                // We are locally dead, waiting for host confirmation. Stays invisible.
                return;
            } else if (this.predictedDeadUntil > 0 && this.predictedDeadUntil < Date.now()) {
                // ⚠️ THE ROLLBACK ⚠️ Host didn't confirm our kill in time.
                this.predictedDeadUntil = 0;
                this.predictedHP = this.hp; // Reset to truth
                if (this.body) this.body.checkCollision.none = false;

                // Visual glitch indicating denied hit
                this.setTint(0x88ccff);
                this.scene.time.delayedCall(200, () => {
                    if (this.active && !this.isDead) {
                        if (this.config.tint !== undefined) {
                            this.setTint(this.config.tint);
                        } else {
                            this.clearTint();
                        }
                    }
                });

                this.setScale(this.config?.spriteInfo?.type === 'spritesheet' ? GAME_CONFIG.ENEMIES[this.enemyType.toUpperCase() as EnemyType]?.scale || 1.5 : 1.5);
                this.setAlpha(1);
            }

            if (this.jitterBuffer) {
                const renderTime = (this.scene as any).networkManager ? (this.scene as any).networkManager.getServerTime() - 100 : Date.now();
                const sample = this.jitterBuffer.sample(renderTime);

                if (sample) {
                    const pPrev = sample.prev.state;
                    const pNext = sample.next.state;
                    const f = sample.factor;

                    const pRx = pPrev[1];
                    const pRy = pPrev[2];
                    const nRx = pNext[1];
                    const nRy = pNext[2];

                    // Snap immediately if teleporting long distances
                    if (Math.abs(pRx - nRx) > 200 || Math.abs(pRy - nRy) > 200) {
                        console.warn(`[Desync] Hard snapping enemy ${this.id} due to large delta`);
                        this.setPosition(pNext[1], pNext[2]);
                    } else {
                        // Smoothly interpolate between the two network states inside the jitter buffer
                        const x = pRx + (nRx - pRx) * f;
                        const y = pRy + (nRy - pRy) * f;
                        this.setPosition(x, y);
                    }

                    const activeState = f > 0.5 ? pNext : pPrev;
                    const anim = activeState[4];
                    const flipX = activeState[5];
                    this.hp = activeState[3]; // Sync HP from network sample

                    // Force maxHP update if we receive a value higher than current (e.g. joined mid-game)
                    if (this.hp > this.maxHP) this.maxHP = this.hp;

                    if (anim && this.anims.currentAnim?.key !== anim) {
                        this.play(anim);
                    }
                    this.setFlipX(flipX === 1);

                    // Healer and Fire Wizard visuals in client mode
                } else if (this.config.tint !== undefined) {
                    this.setTint(this.config.tint);
                }
            } else if (this.attackLight) {
                this.attackLight.setVisible(false);
            }
        } else {
            // Fallback interpolation if no buffer bounds exist yet
            const tx = this.getData('targetX');
            const ty = this.getData('targetY');
            if (tx !== undefined && ty !== undefined) {
                const dx = tx - this.x;
                const dy = ty - this.y;
                if (Math.abs(dx) > 150 || Math.abs(dy) > 150) {
                    this.setPosition(tx, ty);
                } else {
                    const moveFactor = Math.min(1, delta / 40);
                    this.x += dx * moveFactor;
                    this.y += dy * moveFactor;
                }
            }

            if (this.isDead || this.isPushingBack || this.isStunned) {
                if (this.isStunned && this.body) {
                    this.setVelocity(0, 0);
                }
                return;
            }
            if (!this.body) return;

            const hasAttackAnim = this.config.spriteInfo.type === 'spritesheet' && this.config.spriteInfo.anims?.attack;

            const triggerAttackAnim = () => {
                this.isAttacking = true;
                this.lastAttackTime = time;
                if (this.config.rangedProjectile) {
                    this.currentAbilityCooldown = this.rollAbilityCooldown();
                }
                this.setVelocity(0, 0);
                if (this.config.spriteInfo.anims?.attack) {
                    this.hasHit = false;
                    this.play(this.config.spriteInfo.anims.attack);

                    // Attack animation completion handler
                    this.once(`animationcomplete-${this.config.spriteInfo.anims.attack}`, () => {
                        if (this.active) {
                            this.isAttacking = false;
                            if (!this.isDead && this.config.spriteInfo.anims?.walk) {
                                this.play(this.config.spriteInfo.anims.walk);
                            }
                        }
                    });

                    // Attack start handler
                    this.once(`animationstart-${this.config.spriteInfo.anims.attack}`, () => {
                        this.hasHit = false;
                    });
                }
            };

            if (this.enemyType === 'healer_wizard') {
                // Healer only animates when a damaged ally is actually within heal range
                const damagedAlly = this.getNearestDamagedAlly();
                const allyDist = damagedAlly
                    ? Phaser.Math.Distance.Between(this.x, this.y, damagedAlly.x, damagedAlly.y)
                    : Infinity;
                if (hasAttackAnim && allyDist < this.attackRange && time > this.lastAttackTime + this.attackCooldown) {
                    triggerAttackAnim();
                }
            } else {
                const nearestTarget = this.getNearestTarget();
                const distance = nearestTarget
                    ? Phaser.Math.Distance.Between(this.x, this.y, nearestTarget.x, nearestTarget.y)
                    : Infinity;
                const cooldown = this.config.rangedProjectile ? this.currentAbilityCooldown : this.attackCooldown;
                if (hasAttackAnim && nearestTarget && distance < this.attackRange && time > this.lastAttackTime + cooldown) {
                    triggerAttackAnim();
                }
            }

            if (this.isAttacking) {
                this.setVelocity(0, 0);

                // Special Visuals for Healer Wizard during cast
                // Refined: We maintain the tint, and the Light2D provides the "glow"
                if (this.config.tint !== undefined) {
                    this.setTint(this.config.tint);
                }

                // ULTRATHINK BUGFIX: Use native Light2D for guaranteed visibility
                if (this.config.attackGlowColor !== undefined) {
                    if (!this.attackLight) {
                        // ADJUST HERE: (x, y, radius, color, intensity)
                        // Lower radius and intensity to make the glow subtle.
                        this.attackLight = this.scene.lights.addLight(this.x, this.y, 60, this.config.attackGlowColor, 0.5);
                    }
                    this.attackLight.setPosition(this.x, this.y);
                    this.attackLight.setVisible(true);
                }
            } else {
                // Restore Light2D for ambient consistency
                if (this.attackLight) {
                    this.attackLight.setVisible(false);
                }

                // Clear glow if not attacking
                if (this.config.attackGlowColor !== undefined && this.postFX.list.length > 0) {
                    this.postFX.clear();
                }
                // Throttled AI
                if (!this.isSpecialMovementActive && time > this.lastAIUpdate + this.AI_UPDATE_INTERVAL) {
                    this.lastAIUpdate = time;
                    this.updateAIPathing();
                }

                if (this.body.velocity.x !== 0) {
                    this.setFlipX(this.body.velocity.x < 0);
                }
            }

            // Damage Frame Logic (Decoupled from Physics)
            if (this.isAttacking && hasAttackAnim && this.anims.currentAnim?.key === this.config.spriteInfo.anims?.attack) {
                const currentFrameIndex = this.anims.currentFrame?.index || 0;

                // Check for Damage Frame
                const damageFrame = this.config.attackDamageFrame ?? this.DEFAULT_DAMAGE_FRAME;
                if (currentFrameIndex === damageFrame && !this.hasHit) {
                    if (this.enemyType === 'healer_wizard') {
                        this.hasHit = true;
                        const target = this.getNearestDamagedAlly();
                        if (target) {
                            this.scene.events.emit('enemy-heal-ally', this, target, this.damage);
                        }
                    } else {
                        const target = this.getNearestTarget() as any;
                        if (target && target.active) {
                            const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

                            if (this.config.rangedProjectile) {
                                this.hasHit = true;
                                // Fire Projectile
                                const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
                                this.scene.events.emit('enemy-fire-projectile', this.x, this.y, angle, this.damage, this.config.rangedProjectile);
                            } else if (distance <= this.attackRange + 10) {
                                this.hasHit = true;
                                // Emit to scene - mainScene identifies which player was hit
                                this.scene.events.emit('enemy-hit-player', this.damage, this.enemyType, this.x, this.y, target);
                            }
                        }
                    }
                }
            }

            if (this.shadow) {
                this.shadow.setPosition(this.x, this.y + (this.height * this.scaleY * 0.3));
            }

        }

        // --- GLOBAL UPDATES (Host & Client) ---
        this.updateHPBar();

        if (!this.isClientMode && this.active) {
            const now = (this.scene as any).networkManager ? (this.scene as any).networkManager.getServerTime() : Date.now();
            this.positionHistory.push([now, this.x, this.y]);

            // Retain up to 1000ms of history for lag compensation
            while (this.positionHistory.length > 0 && now - this.positionHistory[0][0] > 1000) {
                this.positionHistory.shift();
            }
        }
    }

    private updateAIPathing() {
        if (!this.active) return;
        const speed = this.movementSpeed;
        const numRays = Enemy.NUM_RAYS;
        const delta = this.scene.game.loop.delta;

        // Zero buffers
        for (let i = 0; i < numRays; i++) {
            Enemy.INTEREST_BUFFER[i] = 0;
            Enemy.DANGER_BUFFER[i] = 0;
        }

        const interests = Enemy.INTEREST_BUFFER;
        const dangers = Enemy.DANGER_BUFFER;

        // --- Target Selection ---
        let nearestTarget: { x: number; y: number } | null = null;
        if (this.enemyType === 'healer_wizard') {
            nearestTarget = this.getNearestDamagedAlly() ?? this.getNearestAlly();
        }
        if (!nearestTarget) nearestTarget = this.getNearestTarget();

        // If no target exists in the entire game, we stop or wander (here we just stop AI)
        if (!nearestTarget) {
            this.setVelocity(0, 0);
            return;
        }

        const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, nearestTarget.x, nearestTarget.y);

        // Interest
        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            let dot = Math.cos(angle - targetAngle);
            interests[i] = Math.max(0, dot);
        }

        const myRadius = Math.max(this.body!.width, this.body!.height) * 0.5;

        // --- Dangers: Static Obstacles (Spatial Grid Lookup) ---
        const staticGrid = (this.scene as any).staticObstacleGrid;
        if (staticGrid) {
            const searchRadius = myRadius + 60;
            const obstacles = staticGrid.findNearby({ x: this.x, y: this.y, width: this.body!.width, height: this.body!.height }, searchRadius);

            for (const obs of obstacles) {
                const obsRadius = obs.width ? Math.max(obs.width, obs.height) * 0.5 : 20;
                const minClearance = myRadius + obsRadius + 20;
                const dist = Phaser.Math.Distance.Between(this.x, this.y, obs.x, obs.y);

                if (dist < minClearance) {
                    const ang = Phaser.Math.Angle.Between(this.x, this.y, obs.x, obs.y);
                    for (let i = 0; i < numRays; i++) {
                        const rayAngle = (i / numRays) * Math.PI * 2;
                        const dot = Math.cos(rayAngle - ang);
                        if (dot > 0.4) {
                            // Scale danger by proximity and intensity of the heading
                            const weight = Math.pow(dot, 2); // Sharper falloff for rays not directly at obstacle
                            const proximity = 1 - (dist / minClearance);
                            dangers[i] = Math.max(dangers[i], weight * proximity);
                        }
                    }
                }
            }
        }

        // --- Separation: Dynamic Entities (Spatial Grid Lookup) ---
        const dynamicGrid = (this.scene as any).spatialGrid;
        if (dynamicGrid) {
            const searchRadius = myRadius + 40;
            const neighbors = dynamicGrid.findNearby({ x: this.x, y: this.y, width: this.body!.width, height: this.body!.height }, searchRadius);

            for (const neighbor of neighbors) {
                if (neighbor.ref === this) continue;
                const neighborRadius = neighbor.width ? Math.max(neighbor.width, neighbor.height) * 0.5 : 20;
                const minSeparation = myRadius + neighborRadius + 10;
                const dist = Phaser.Math.Distance.Between(this.x, this.y, neighbor.x, neighbor.y);

                if (dist < minSeparation) {
                    const ang = Phaser.Math.Angle.Between(this.x, this.y, neighbor.x, neighbor.y);
                    for (let i = 0; i < numRays; i++) {
                        const rayAngle = (i / numRays) * Math.PI * 2;
                        const dot = Math.cos(rayAngle - ang);
                        if (dot > 0.6) {
                            dangers[i] = Math.max(dangers[i], dot * (1 - dist / minSeparation) * 0.8);
                        }
                    }
                }
            }
        }

        // --- Direction Selection ---
        let bestDir = -1;
        let maxScore = -1;

        for (let i = 0; i < numRays; i++) {
            const score = interests[i] - dangers[i];
            if (score > maxScore) {
                maxScore = score;
                bestDir = i;
            }
        }

        // --- Stuck Detection & Recovery ---
        const currentSpeed = (this.body as Phaser.Physics.Arcade.Body).speed;
        const stuckThreshold = this.id.includes('boss') ? speed * 0.4 : speed * 0.2;

        // If we want to move but are slow
        if (maxScore > 0.3 && currentSpeed < stuckThreshold) {
            this.stuckTimer += delta;
        } else {
            this.stuckTimer = Math.max(0, this.stuckTimer - delta * 2);
        }

        const stuckDurationLimit = this.id.includes('boss') ? 150 : 250;
        if (this.stuckTimer > stuckDurationLimit && this.recoveryTimer <= 0) {
            // TRAP ERADICATION: Scan for the clearest path that still has some forward interest
            let bestRecoveryIdx = -1;
            let bestRecoveryScore = -100;

            for (let i = 0; i < numRays; i++) {
                // Recovery score: High interest (forward-ish), LOW danger
                // We weight danger heavily to find a way OUT of the trap.
                const recoveryScore = interests[i] * 0.5 - (dangers[i] * 2.0);
                if (recoveryScore > bestRecoveryScore) {
                    bestRecoveryScore = recoveryScore;
                    bestRecoveryIdx = i;
                }
            }

            if (bestRecoveryIdx !== -1) {
                this.recoveryAngle = (bestRecoveryIdx / numRays) * Math.PI * 2;
                this.recoveryTimer = 800 + Math.random() * 400; // 0.8s - 1.2s of recovery
                this.stuckTimer = 0;
            }
        }

        let finalMoveAngle = 0;
        if (this.recoveryTimer > 0) {
            this.recoveryTimer -= delta;
            finalMoveAngle = this.recoveryAngle;
        } else if (bestDir !== -1) {
            finalMoveAngle = (bestDir / numRays) * Math.PI * 2;
        } else {
            this.setVelocity(0, 0);
            return;
        }

        this.setVelocity(
            Math.cos(finalMoveAngle) * speed,
            Math.sin(finalMoveAngle) * speed
        );
    }

    protected updateHPBar() {
        const quality = (this.scene as any).quality;

        if (quality?.hpBarsEnabled === false) {
            this.hpBar.clear();
            this.lastDrawnHP = -1;
            return;
        }

        if (this.isDead || !this.active) {
            this.hpBar.clear();
            this.lastDrawnHP = -1;
            return;
        }

        // Hide health bar if enemy is outside the player's outer light radius
        if (quality?.lightingEnabled) {
            const outerLight = (this.scene as any).outerPlayerLight as Phaser.GameObjects.Light | undefined;
            const player = this.scene.data?.get('player') as Phaser.Physics.Arcade.Sprite | undefined;
            if (outerLight && player) {
                const dx = this.x - player.x;
                const dy = this.y - player.y;
                const distSq = dx * dx + dy * dy;
                const maxDist = outerLight.radius + 50; // small margin beyond outer light edge
                if (distSq > maxDist * maxDist) {
                    this.hpBar.clear();
                    this.lastDrawnHP = -1;
                    return;
                }
            }
        }

        // 1. Always update position of the container graphics object.
        // We set the position to the enemy's world position, plus an offset.
        const width = 40;
        const height = 5;
        const offsetY = -(this.height / 2 * this.scaleX) - 5;
        this.hpBar.setPosition(this.x, this.y + offsetY);

        // 2. Decide if we need to redraw the graphics based on health or scale changes.
        const mode = quality?.hpBarUpdateMode || 'continuous';
        const needsRedraw = mode === 'continuous' ||
            this.hp !== this.lastDrawnHP ||
            this.maxHP !== this.lastDrawnMaxHP ||
            this.scaleX !== this.lastDrawnScale;

        if (needsRedraw) {
            this.lastDrawnHP = this.hp;
            this.lastDrawnMaxHP = this.maxHP;
            this.lastDrawnScale = this.scaleX;

            this.hpBar.clear();

            // Use relative coordinates (0 is the center of the graphics object which we positioned above)
            const rx = -width / 2;
            const ry = 0;

            this.hpBar.fillStyle(0x000000, 0.5);
            this.hpBar.fillRect(rx, ry, width, height);

            const healthWidth = (Math.max(0, this.hp) / this.maxHP) * width;
            this.hpBar.fillStyle(0xff0000, 1);
            this.hpBar.fillRect(rx, ry, healthWidth, height);
        }
    }

    takeDamage(amount: number, color: string = '#ffffff', isShared: boolean = false) {
        if (this.isDead || !this.active) return;

        this.hp -= amount;
        this.predictedHP = this.hp;

        this.scene.events.emit('enemy-hit');
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (this.active && !this.isDead && !this.predictedDeadUntil) {
                if (this.isStunned) this.setTint(0x8888ff);
                else if (this.config.tint !== undefined) this.setTint(this.config.tint);
                else this.clearTint();
            }
        });

        if ((this.scene as any).poolManager) {
            (this.scene as any).poolManager.getDamageText(this.x, this.y - 30, amount, isShared ? '#bf00ff' : color);
        }

        // SOUL LINK: Share damage
        if (!isShared && this.linkedEnemy && this.linkedEnemy.active && !this.linkedEnemy.getIsDead()) {
            const sharedAmount = amount * 0.4;
            this.linkedEnemy.takeDamage(sharedAmount, '#bf00ff', true);
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    /**
     * Predictive damage allows the client to immediately react to their own hits,
     * without waiting for the host to validate.
     */
    predictDamage(amount: number) {
        if (!this.isClientMode || !this.active || this.predictedDeadUntil > 0) return;

        this.predictedHP -= amount;

        if (this.predictedHP <= 0) {
            this.predictDeath();
        }
    }

    /**
     * Executes the visual death sequence immediately for the local client,
     * hiding the enemy and disabling collisions while waiting for host confirmation.
     */
    protected predictDeath() {
        if (this.predictedDeadUntil > 0) return; // Already predicted

        // Give host 500ms to confirm the kill via enemy_death event, else rollback
        this.predictedDeadUntil = Date.now() + 500;

        if (this.body) this.body.checkCollision.none = true;
        this.hpBar.clear();

        if ((this.scene as any).poolManager) {
            (this.scene as any).poolManager.spawnBloodEffect(this.x, this.y);
        }

        this.setTint(0xffffff);
        this.spawnDeathSparks();

        const popScale = this.scaleX * 1.25;
        this.setScale(popScale);

        this.scene.time.delayedCall(80, () => {
            if (this.active) this.setTint(0x555555);
        });

        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 380,
            ease: 'Cubic.in'
            // We DO NOT disable() here. We wait for host to call either disable/die, or rollback happens
        });
    }

    protected die() {
        this.isDead = true;
        this.setDrag(1000);
        this.hpBar.clear();

        // Clear Soul Link
        if (this.linkedEnemy) {
            if (this.linkedEnemy.linkedEnemy === this) {
                this.linkedEnemy.linkedEnemy = null;
            }
            this.linkedEnemy = null;
        }

        if ((this.scene as any).poolManager) {
            (this.scene as any).poolManager.spawnBloodEffect(this.x, this.y);
        }

        this.emit('dead', this.x, this.y);
        console.log(`Enemy ${this.enemyType} emitted 'dead' event at ${this.x}, ${this.y}. Listeners:`, this.listenerCount('dead'));

        // ── Death visual sequence ────────────────────────────────────────────
        // 1. Brief white flash to signal the killing blow.
        this.clearTint();
        this.setTint(0xffffff);
        this.postFX.clear();

        // 2. Spark burst at death position (uses 'spark' texture created in MainScene).
        this.spawnDeathSparks();

        // 3. Scale-pop: briefly enlarge then shrink to zero while fading.
        //    This gives a satisfying "pop" rather than a plain alpha fade.
        const popScale = this.scaleX * 1.25;
        this.setScale(popScale);

        // After the white flash settles, switch to the dark dissolve tint.
        this.scene.time.delayedCall(80, () => {
            if (this.active) this.setTint(0x555555);
        });

        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 380,
            ease: 'Cubic.in',
            onComplete: () => {
                this.disable();
            }
        });
    }

    /**
     * Emits a one-shot burst of tiny sparks at the enemy's position.
     * Uses the centralized emitter in MainScene to avoid object churn.
     */
    private spawnDeathSparks() {
        const scene = this.scene as unknown as IMainScene;
        if (scene.deathSparkEmitter) {
            scene.deathSparkEmitter.emitParticleAt(this.x, this.y, 10);
        }
    }

    /** Public so WaveManager (and other systems) can return this enemy to the pool without destroying it. */
    public disable() {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) this.body.enable = false;
        if (this.shadow) this.shadow.setVisible(false);
        if (this.hpBar) this.hpBar.clear();
        if (this.attackLight) this.attackLight.setVisible(false);
        this.isClientMode = false;
        // Do NOT call destroy() — keep in pool for reuse
    }

    public destroy(fromScene?: boolean) {
        if (this.hpBar) {
            this.hpBar.destroy();
        }
        if (this.shadow) {
            this.shadow.destroy();
        }
        if (this.attackLight) {
            this.scene.lights.removeLight(this.attackLight);
        }
        if (this.slowTimer) {
            this.slowTimer.remove();
        }
        if (this.poisonTimer) {
            this.poisonTimer.remove();
        }
        if (this.stunTimer) {
            this.stunTimer.remove();
        }
        super.destroy(fromScene);
    }

    /**
     * Call with `true` on clients to make this a position-only puppet.
     * The physics body remains active to register overlaps (hit_requests),
     * but we disable its response to physics forces. 
     */
    public setClientMode(enabled: boolean) {
        this.isClientMode = enabled;
        if (this.body) {
            // ULTRATHINK BUGFIX: Do NOT set enable = false. 
            // We need enable = true to trigger overlaps.
            // We set moves = false so arcade physics doesn't try to displace it against JitterBuffer.
            const arcadeBody = this.body as Phaser.Physics.Arcade.Body;
            arcadeBody.moves = !enabled;
            this.body.checkCollision.none = false; // Reset collision state
        }
        if (enabled && !this.jitterBuffer) {
            this.jitterBuffer = new JitterBuffer<PackedEnemy>(30);
        }
    }

    public pushState(ts: number, packet: PackedEnemy) {
        if (!this.jitterBuffer) return;
        this.jitterBuffer.push(ts, packet);
    }

    public stun(duration: number): void {
        if (this.isDead || !this.active) return;
        this.isStunned = true;
        if (this.body) this.setVelocity(0, 0);
        this.setTint(0x8888ff);

        if (this.stunTimer) this.stunTimer.remove();
        this.stunTimer = this.scene.time.delayedCall(duration, () => {
            if (this.active && !this.isDead) {
                this.isStunned = false;
                if (this.config.tint !== undefined) {
                    this.setTint(this.config.tint);
                } else {
                    this.clearTint();
                }
            }
        });
    }

    public pushback(sourceX: number, sourceY: number, force: number = 400) {
        if (!this.active || this.isDead) return;

        const balanceStats = GAME_CONFIG.ENEMIES[this.enemyType.toUpperCase() as EnemyType];
        const resistance = balanceStats ? balanceStats.knockbackResistance : 0;
        const netForce = Math.max(0, force * (1 - resistance));

        if (netForce < 10) return;

        this.isPushingBack = true;
        this.isAttacking = false;

        this.clearTint();
        this.setTint(0xffffff);
        this.postFX.clear();

        const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.x, this.y);
        this.setVelocity(
            Math.cos(angle) * netForce,
            Math.sin(angle) * netForce
        );

        this.scene.time.delayedCall(200, () => {
            if (!this.active) return;
            this.isPushingBack = false;

            if (this.isDead) {
                this.setTint(0x444444);
            } else {
                if (this.isStunned) {
                    this.setTint(0x8888ff);
                } else if (this.config.tint !== undefined) {
                    this.setTint(this.config.tint);
                } else {
                    this.clearTint();
                }

                if (this.config.spriteInfo.anims?.walk && !this.isStunned) {
                    this.play(this.config.spriteInfo.anims.walk);
                }
            }
        });
    }

    public applySlow(durationMs: number) {
        if (!this.active || this.isDead) return;

        // Store original speed on first slow
        if (this.slowTimer === null) {
            this.originalSpeed = this.movementSpeed;
            this.setTint(0x88ccff); // Blue frost tint
            this.postFX.addGlow(0x00aaff, 4, 0, false, 0.1, 10); // Add blue glow
        } else {
            // Reset timer if already slowed
            this.slowTimer.remove();
        }

        // Reduce movement speed by 50%
        this.movementSpeed = this.originalSpeed * 0.5;

        // Set timer to restore speed
        this.slowTimer = this.scene.time.delayedCall(durationMs, () => {
            if (this.active && !this.isDead) {
                this.movementSpeed = this.originalSpeed;
                this.clearTint();
                this.postFX.clear(); // Remove glow
                if (this.config.spriteInfo.anims?.walk) {
                    this.play(this.config.spriteInfo.anims.walk);
                }
            }
            this.slowTimer = null;
        });
    }

    public applyPoison(level: number, damage: number): void {
        if (!this.active || this.isDead) return;

        const ticks = [4, 6, 8][level - 1] ?? 4;
        const tickDamage = damage * 0.08;
        const tickInterval = 1000;

        if (this.poisonTimer) {
            this.poisonTimer.remove(false);
            this.poisonTimer = null;
        }

        if (!this.isPoisoned) {
            this.isPoisoned = true;
            this.setTint(0x44ff44);
            this.postFX.addGlow(0x00cc44, 4, 0, false, 0.1, 10);
        }

        let ticksLeft = ticks;
        const doTick = () => {
            if (!this.active || this.isDead) return;
            this.takeDamage(tickDamage, '#00cc44');
            ticksLeft--;
            if (ticksLeft > 0) {
                this.poisonTimer = this.scene.time.delayedCall(tickInterval, doTick);
            } else {
                this.isPoisoned = false;
                this.poisonTimer = null;
                if (this.isStunned) {
                    this.setTint(0x8888ff);
                } else if (this.config.tint !== undefined) {
                    this.setTint(this.config.tint);
                } else {
                    this.clearTint();
                }
                this.postFX.clear();
            }
        };

        this.poisonTimer = this.scene.time.delayedCall(tickInterval, doTick);
    }

    /** Consumes the slow effect, returning true if the enemy was slowed. */
    public consumeSlow(): boolean {
        if (!this.active || this.isDead || this.slowTimer === null) return false;

        this.slowTimer.remove();
        this.slowTimer = null;
        this.movementSpeed = this.originalSpeed;
        this.clearTint();
        this.postFX.clear(); // Remove glow
        if (this.config.spriteInfo.anims?.walk) {
            this.play(this.config.spriteInfo.anims.walk);
        }
        return true;
    }

    /**
     * Interpolates the enemy's historical position at a given timestamp.
     * Essential for Lag Compensation (Rollback Auth) on the Host.
     */
    public getHistoricalPosition(targetTime: number): { x: number, y: number } | null {
        if (this.positionHistory.length === 0) return null;

        if (targetTime <= this.positionHistory[0][0]) {
            return { x: this.positionHistory[0][1], y: this.positionHistory[0][2] };
        }

        const newest = this.positionHistory[this.positionHistory.length - 1];
        if (targetTime >= newest[0]) {
            return { x: newest[1], y: newest[2] };
        }

        for (let i = this.positionHistory.length - 1; i >= 1; i--) {
            const next = this.positionHistory[i];
            const prev = this.positionHistory[i - 1];

            if (targetTime >= prev[0] && targetTime <= next[0]) {
                const range = next[0] - prev[0];
                const f = range === 0 ? 0 : (targetTime - prev[0]) / range;
                const hX = prev[1] + (next[1] - prev[1]) * f;
                const hY = prev[2] + (next[2] - prev[2]) * f;
                return { x: hX, y: hY };
            }
        }

        return null;
    }

    private getNearestTarget(): Phaser.GameObjects.Components.Transform | null {
        const mainScene = this.scene as any;
        const partyState: { id: string, isDead: boolean }[] = mainScene.registry.get('partyState') || [];

        let validTargets: any[] = [];

        // Local player
        const localIsDead = mainScene.registry.get('playerHP') <= 0;
        if (!localIsDead && (this.targetStart as any).active) {
            validTargets.push(this.targetStart);
        }

        // Remote players
        if (mainScene.remotePlayers) {
            mainScene.remotePlayers.forEach((remotePlayer: any, id: string) => {
                const ps = partyState.find(p => p.id === id);
                const isDead = ps ? ps.isDead : false;
                if (remotePlayer.active && !isDead) {
                    validTargets.push(remotePlayer);
                }
            });
        }

        if (validTargets.length === 0) {
            return this.targetStart; // Fallback so they don't break
        }

        let nearestTarget = validTargets[0];
        let minDist = Phaser.Math.Distance.Between(this.x, this.y, nearestTarget.x, nearestTarget.y);

        for (let i = 1; i < validTargets.length; i++) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, validTargets[i].x, validTargets[i].y);
            if (dist < minDist) {
                minDist = dist;
                nearestTarget = validTargets[i];
            }
        }

        return nearestTarget;
    }

    private getNearestDamagedAlly(): Enemy | null {
        const grid = (this.scene as any).spatialGrid;
        if (!grid) return null;

        // Search in a larger radius for allies
        const searchRadius = this.attackRange * 1.5;
        const neighbors = grid.findNearby({
            x: this.x,
            y: this.y,
            width: this.body!.width,
            height: this.body!.height
        }, searchRadius);

        let nearestAlly: Enemy | null = null;
        let minDist = searchRadius;

        for (const neighbor of neighbors) {
            if (neighbor === this) continue;

            // neighbor is from grid, we need to check if it's an Enemy
            // Assuming grid stores Enemy bodies or objects with hp
            const enemy = neighbor as Enemy;
            if (enemy && enemy.active && !enemy.getIsDead() && enemy.hp < enemy.maxHP) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearestAlly = enemy;
                }
            }
        }

        return nearestAlly;
    }

    private getNearestAlly(): Enemy | null {
        const grid = (this.scene as any).spatialGrid;
        if (!grid) return null;

        const searchRadius = 600;
        const neighbors = grid.findNearby({
            x: this.x,
            y: this.y,
            width: this.body!.width,
            height: this.body!.height
        }, searchRadius);

        let nearestAlly: Enemy | null = null;
        let minDist = searchRadius;

        for (const neighbor of neighbors) {
            if (neighbor === this) continue;
            const enemy = neighbor as Enemy;
            if (enemy && enemy.active && !enemy.getIsDead()) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearestAlly = enemy;
                }
            }
        }

        return nearestAlly;
    }
}
