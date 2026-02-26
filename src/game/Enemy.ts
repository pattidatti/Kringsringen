import Phaser from 'phaser';
import { ENEMY_TYPES, type EnemyConfig } from '../config/enemies';
import { GAME_CONFIG, type EnemyType } from '../config/GameConfig';
import type { IMainScene } from './IMainScene';
import { JitterBuffer } from '../network/JitterBuffer';
import type { PackedEnemy } from '../network/SyncSchemas';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private targetStart: Phaser.GameObjects.Components.Transform; // Renamed to avoid confusion with internal target
    public hp: number = 50;
    public maxHP: number = 50;
    protected hpBar: Phaser.GameObjects.Graphics;
    protected isDead: boolean = false;
    private attackRange: number = 60;
    private attackCooldown: number = 1500;
    private lastAttackTime: number = 0;
    protected isAttacking: boolean = false;
    public hasHit: boolean = false;
    private readonly DEFAULT_DAMAGE_FRAME: number = 3; // Fallback frame where damage occurs
    public isOnDamageFrame: boolean = false;
    private isPushingBack: boolean = false;
    protected movementSpeed: number = 100;
    private enemyType: string = 'orc';
    private config: EnemyConfig;
    private slowTimer: Phaser.Time.TimerEvent | null = null;
    protected originalSpeed: number = 100;
    private shadow: Phaser.GameObjects.Sprite | null = null;
    public id: string = "";

    // Predictive Death (Client-side)
    private predictedDeadUntil: number = 0;
    private predictedHP: number = 0;

    /** When true this enemy is a client-side puppet — no AI, no damage, no physics body active. */
    private isClientMode: boolean = false;

    /** History buffer for Lag Compensation (Host only). Stores [timestamp, x, y] tuples. */
    public positionHistory: [number, number, number][] = [];

    /** Jitter buffer for smooth interpolation (Client only). */
    private jitterBuffer: JitterBuffer<PackedEnemy> | null = null;

    // Static Buffers for AI (GC Hardening)
    private static readonly NUM_RAYS = 16;
    private static readonly INTEREST_BUFFER = new Array(Enemy.NUM_RAYS).fill(0);
    private static readonly DANGER_BUFFER = new Array(Enemy.NUM_RAYS).fill(0);

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
        this.setRotation(0);

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

        this.predictedDeadUntil = 0;
        this.predictedHP = this.hp;

        // Clear slow state
        if (this.slowTimer) {
            this.slowTimer.remove();
            this.slowTimer = null;
        }
        this.originalSpeed = this.movementSpeed;
        this.positionHistory = [];

        // Animation
        this.setTexture(this.config.spriteInfo.texture);
        if (this.config.spriteInfo.type === 'spritesheet' && this.config.spriteInfo.anims) {
            this.play(this.config.spriteInfo.anims.walk);
        }
        this.setPipeline('Light2D');

        // Animation Listeners (Clean previous listeners to avoid duplicates if not careful, 
        // but Phaser usually handles 'on' by adding. We should check if listener exists or just use internal flags)
        // Better: Define one-time listeners in constructor, but their logic needs to check current state.

        // Reset HP Bar
        this.updateHPBar();
    }

    public getIsDead(): boolean {
        return this.isDead;
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
                    if (this.active && !this.isDead) this.clearTint();
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

                    if (anim && this.anims.currentAnim?.key !== anim) {
                        this.play(anim);
                    }
                    this.setFlipX(flipX === 1);
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
                }
            }

            if (this.shadow) this.shadow.setPosition(this.x, this.y + (this.height * this.scaleY * 0.3));
            this.updateHPBar();
            return;
        }

        if (this.isDead || this.isPushingBack) return;
        if (!this.body) return;

        const nearestTarget = this.getNearestTarget();
        const distance = Phaser.Math.Distance.Between(this.x, this.y, nearestTarget.x, nearestTarget.y);
        const hasAttackAnim = this.config.spriteInfo.type === 'spritesheet' && this.config.spriteInfo.anims?.attack;

        if (hasAttackAnim && distance < this.attackRange && time > this.lastAttackTime + this.attackCooldown) {
            this.isAttacking = true;
            this.lastAttackTime = time;
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
        }

        if (this.isAttacking) {
            this.setVelocity(0, 0);
        } else {
            // Throttled AI
            if (time > this.lastAIUpdate + this.AI_UPDATE_INTERVAL) {
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
                const target = this.getNearestTarget();
                if (target && target.active) {
                    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
                    // Allow slightly more range than attackRange to feel fair (the swing has reach)
                    if (distance <= this.attackRange + 10) {
                        this.hasHit = true;

                        // Emit to scene - mainScene identifies which player was hit
                        this.scene.events.emit('enemy-hit-player', this.damage, this.enemyType, this.x, this.y, target);
                    }
                }
            }
        }

        if (this.shadow) {
            this.shadow.setPosition(this.x, this.y + (this.height * this.scaleY * 0.3));
        }

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

        // Zero out the static buffers instead of allocating `new Array()`
        for (let i = 0; i < numRays; i++) {
            Enemy.INTEREST_BUFFER[i] = 0;
            Enemy.DANGER_BUFFER[i] = 0;
        }

        const interests = Enemy.INTEREST_BUFFER;
        const dangers = Enemy.DANGER_BUFFER;

        // --- Multi-Targeting Logic (Host Only) ---
        // Find nearest player among local player and all remote players
        let nearestTarget = this.targetStart as any;
        let minDist = Phaser.Math.Distance.Between(this.x, this.y, nearestTarget.x, nearestTarget.y);

        const mainScene = this.scene as any;
        if (mainScene.remotePlayers) {
            mainScene.remotePlayers.forEach((remotePlayer: any) => {
                if (remotePlayer.active) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, remotePlayer.x, remotePlayer.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestTarget = remotePlayer;
                    }
                }
            });
        }

        const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, nearestTarget.x, nearestTarget.y);

        // Interest
        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            let dot = Math.cos(angle - targetAngle);
            interests[i] = Math.max(0, dot);
        }

        // Dangers (Obstacles)
        const obstacles = (this.scene as any).obstacles as Phaser.Physics.Arcade.StaticGroup;
        if (obstacles) {
            const myRadius = Math.max(this.body!.width, this.body!.height) * 0.5;

            obstacles.getChildren().forEach((obs: any) => {
                if (!obs.active) return;

                const obsBody = obs.body as Phaser.Physics.Arcade.Body;
                const obsRadius = obsBody ? Math.max(obsBody.width, obsBody.height) * 0.5 : 20;
                const minClearance = myRadius + obsRadius + 40; // 40px extra clearance padding

                const dist = Phaser.Math.Distance.Between(this.x, this.y, obs.x, obs.y);
                if (dist < minClearance) {
                    const ang = Phaser.Math.Angle.Between(this.x, this.y, obs.x, obs.y);
                    for (let i = 0; i < numRays; i++) {
                        const rayAngle = (i / numRays) * Math.PI * 2;
                        let dot = Math.cos(rayAngle - ang);
                        if (dot > 0.7) {
                            dangers[i] = Math.max(dangers[i], dot * (1 - dist / minClearance));
                        }
                    }
                }
            });
        }

        // Separation using Spatial Grid
        const grid = (this.scene as any).spatialGrid; // Access grid from scene
        if (grid) {
            const myRadius = Math.max(this.body!.width, this.body!.height) * 0.5;
            const searchRadius = myRadius + 50; // Increased radius to check

            const neighbors = grid.findNearby({
                x: this.x,
                y: this.y,
                width: this.body!.width,
                height: this.body!.height
            }, searchRadius);

            for (const neighbor of neighbors) {
                // Approximate distance check since grid returns candidates

                // Skip self check is hard without ID, but valid coordinates check works
                if (Math.abs(neighbor.x - this.x) < 1 && Math.abs(neighbor.y - this.y) < 1) continue;

                // Neighbor radius approximation
                const neighborRadius = neighbor.width ? Math.max(neighbor.width, neighbor.height) * 0.5 : 20;
                const minSeparation = myRadius + neighborRadius + 10;

                const dist = Phaser.Math.Distance.Between(this.x, this.y, neighbor.x, neighbor.y);
                if (dist < minSeparation) {
                    const ang = Phaser.Math.Angle.Between(this.x, this.y, neighbor.x, neighbor.y);
                    for (let i = 0; i < numRays; i++) {
                        const rayAngle = (i / numRays) * Math.PI * 2;
                        let dot = Math.cos(rayAngle - ang);
                        // Increase sensitivity for separation
                        if (dot > 0.5) {
                            dangers[i] = Math.max(dangers[i], dot * (1 - dist / minSeparation));
                        }
                    }
                }
            }
        }

        // Direction
        let bestDir = -1;
        let maxScore = -1;

        for (let i = 0; i < numRays; i++) {
            const score = interests[i] - dangers[i];
            if (score > maxScore) {
                maxScore = score;
                bestDir = i;
            }
        }

        if (bestDir !== -1) {
            const moveAngle = (bestDir / numRays) * Math.PI * 2;
            this.setVelocity(
                Math.cos(moveAngle) * speed,
                Math.sin(moveAngle) * speed
            );
        }
    }

    protected updateHPBar() {
        this.hpBar.clear();
        if (this.isDead || !this.active) return;

        const width = 40;
        const height = 5;
        const x = this.x - width / 2;
        const y = this.y - (this.height / 2 * this.scaleX) - 5;

        this.hpBar.fillStyle(0x000000, 0.5);
        this.hpBar.fillRect(x, y, width, height);

        const healthWidth = (Math.max(0, this.hp) / this.maxHP) * width;
        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(x, y, healthWidth, height);
    }

    takeDamage(amount: number, color: string = '#ffffff') {
        if (this.isDead || !this.active) return;

        this.hp -= amount;
        this.predictedHP = this.hp;

        this.scene.events.emit('enemy-hit');
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (this.active && !this.isDead && !this.predictedDeadUntil) this.clearTint();
        });

        if ((this.scene as any).poolManager) {
            (this.scene as any).poolManager.getDamageText(this.x, this.y - 30, amount, color);
        }

        if (this.hp <= 0) {
            console.log(`Enemy ${this.enemyType} reached 0 HP, calling die()`);
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

        if ((this.scene as any).poolManager) {
            (this.scene as any).poolManager.spawnBloodEffect(this.x, this.y);
        }

        this.emit('dead', this.x, this.y);
        console.log(`Enemy ${this.enemyType} emitted 'dead' event at ${this.x}, ${this.y}. Listeners:`, this.listenerCount('dead'));

        // ── Death visual sequence ────────────────────────────────────────────
        // 1. Brief white flash to signal the killing blow.
        this.setTint(0xffffff);

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
        this.isClientMode = false;
        // Do NOT call destroy() — keep in pool for reuse
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
                this.clearTint();
                if (this.config.spriteInfo.anims?.walk) {
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

    private getNearestTarget(): any {
        let nearestTarget = this.targetStart as any;
        let minDist = Phaser.Math.Distance.Between(this.x, this.y, nearestTarget.x, nearestTarget.y);

        const mainScene = this.scene as any;
        if (mainScene.remotePlayers) {
            mainScene.remotePlayers.forEach((remotePlayer: any) => {
                if (remotePlayer.active) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, remotePlayer.x, remotePlayer.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestTarget = remotePlayer;
                    }
                }
            });
        }
        return nearestTarget;
    }
}
