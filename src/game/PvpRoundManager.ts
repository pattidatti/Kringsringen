import type { IMainScene } from './IMainScene';
import { PacketType } from '../network/SyncSchemas';
import type { PvpRoundResult } from '../components/ui/PvpRoundSummary';
import type { PvpMatchResultData } from '../components/ui/PvpMatchResult';

export type PvpState = 'waiting' | 'countdown' | 'fighting' | 'round_end' | 'shop' | 'match_end';

const ROUND_DURATION = 120; // seconds
const COUNTDOWN_DURATION = 3; // seconds
const GOLD_WINNER = 200;
const GOLD_LOSER = 500;

/**
 * Manages PVP round state machine, timer, scoring, and synchronized start.
 * Owned by MainScene in PVP mode.
 */
export class PvpRoundManager {
    private scene: IMainScene;
    private state: PvpState = 'waiting';
    private score: [number, number] = [0, 0];
    private bestOf: number = 5;
    private currentRound: number = 1;
    private roundTimer: number = ROUND_DURATION;
    private countdownTimer: number = COUNTDOWN_DURATION;
    private roundStartTime: number = 0;
    private roundResults: Array<{ winner: 'player' | 'opponent'; reason: 'death' | 'timeout' }> = [];

    // Tracking damage dealt this round
    private playerDamageDealt: number = 0;
    private opponentDamageDealt: number = 0;

    // Ready tracking
    private localReady: boolean = false;
    private remoteReady: boolean = false;

    // NTP-synced start time
    private scheduledStartTime: number = 0;

    // Accumulator for timer ticks
    private timerAccumulator: number = 0;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    public initialize(): void {
        this.bestOf = this.scene.registry.get('pvpBestOf') || 5;
        this.score = [0, 0];
        this.currentRound = 1;
        this.roundResults = [];

        // Set initial registry values
        this.scene.registry.set('pvpScore', this.score);
        this.scene.registry.set('pvpRound', this.currentRound);
        this.scene.registry.set('pvpBestOf', this.bestOf);
        this.scene.registry.set('pvpRoundTimer', ROUND_DURATION);
        this.scene.registry.set('pvpCountdown', 0);
        this.scene.registry.set('pvpRoundResult', null);
        this.scene.registry.set('pvpMatchResult', null);
        this.scene.registry.set('pvpDamageDealt', 0);

        this.setState('waiting');

        // Listen for PVP events from network
        this.scene.events.on('pvp_ready', this.handleRemoteReady, this);
        this.scene.events.on('pvp_round_start', this.handleRoundStart, this);
        this.scene.events.on('pvp_round_end', this.handleRemoteRoundEnd, this);
        this.scene.events.on('pvp_match_end', this.handleRemoteMatchEnd, this);
        this.scene.events.on('pvp_rematch', this.handleRematch, this);

        // Start first round automatically after a short delay
        this.scene.time.delayedCall(1000, () => {
            this.setLocalReady();
        });
    }

    private setState(state: PvpState): void {
        this.state = state;
        this.scene.registry.set('pvpState', state);
    }

    public getState(): PvpState {
        return this.state;
    }

    /**
     * Called every frame from MainScene.update()
     */
    public update(_time: number, delta: number): void {
        switch (this.state) {
            case 'countdown':
                this.updateCountdown(delta);
                break;
            case 'fighting':
                this.updateFighting(delta);
                break;
        }
    }

    private updateCountdown(delta: number): void {
        if (this.scheduledStartTime > 0) {
            const serverTime = this.scene.networkManager
                ? this.scene.networkManager.getServerTime()
                : Date.now();
            const remaining = (this.scheduledStartTime - serverTime) / 1000;

            if (remaining <= 0) {
                // Start fighting
                this.scheduledStartTime = 0;
                this.startFighting();
                return;
            }

            const countdownVal = Math.ceil(remaining);
            if (countdownVal !== this.countdownTimer) {
                this.countdownTimer = countdownVal;
                this.scene.registry.set('pvpCountdown', countdownVal);
            }
        } else {
            // Fallback: use delta accumulation
            this.timerAccumulator += delta;
            if (this.timerAccumulator >= 1000) {
                this.timerAccumulator -= 1000;
                this.countdownTimer--;
                this.scene.registry.set('pvpCountdown', Math.max(0, this.countdownTimer));

                if (this.countdownTimer <= 0) {
                    this.startFighting();
                }
            }
        }
    }

    private updateFighting(delta: number): void {
        this.timerAccumulator += delta;
        if (this.timerAccumulator >= 1000) {
            this.timerAccumulator -= 1000;
            this.roundTimer--;
            this.scene.registry.set('pvpRoundTimer', Math.max(0, this.roundTimer));

            if (this.roundTimer <= 0) {
                this.handleTimeout();
            }
        }

        // Check for death
        const playerHP = this.scene.registry.get('playerHP') || 0;
        if (playerHP <= 0) {
            this.endRound('opponent', 'death');
        }

        // Check if opponent died (host checks remote player HP)
        if (this.scene.networkManager?.role === 'host') {
            const remotePackets = this.scene.networkPacketHandler?.remotePlayerPackets;
            if (remotePackets) {
                for (const [, packet] of remotePackets) {
                    if (packet[5] <= 0) { // HP field
                        this.endRound('player', 'death');
                        break;
                    }
                }
            }
        }
    }

    private handleTimeout(): void {
        // Compare HP percentages
        const playerHP = this.scene.registry.get('playerHP') || 0;
        const playerMaxHP = this.scene.registry.get('playerMaxHP') || 100;
        const playerPct = playerHP / playerMaxHP;

        let opponentPct = 0;
        const remotePackets = this.scene.networkPacketHandler?.remotePlayerPackets;
        if (remotePackets) {
            for (const [, packet] of remotePackets) {
                opponentPct = packet[5] / playerMaxHP; // Approximate
                break;
            }
        }

        const winner: 'player' | 'opponent' = playerPct >= opponentPct ? 'player' : 'opponent';
        this.endRound(winner, 'timeout');
    }

    private startFighting(): void {
        this.setState('fighting');
        this.roundTimer = ROUND_DURATION;
        this.timerAccumulator = 0;
        this.playerDamageDealt = 0;
        this.opponentDamageDealt = 0;
        this.roundStartTime = Date.now();
        this.scene.registry.set('pvpRoundTimer', ROUND_DURATION);
        this.scene.registry.set('pvpCountdown', 0);

        // Enable combat
        this.scene.registry.set('pvpFightActive', true);
    }

    private endRound(winner: 'player' | 'opponent', reason: 'death' | 'timeout'): void {
        if (this.state !== 'fighting') return;

        // Disable combat
        this.scene.registry.set('pvpFightActive', false);

        // Update score
        if (winner === 'player') {
            this.score[0]++;
        } else {
            this.score[1]++;
        }
        this.scene.registry.set('pvpScore', [...this.score]);

        this.roundResults.push({ winner, reason });

        const roundDuration = Math.round((Date.now() - this.roundStartTime) / 1000);
        const playerHP = this.scene.registry.get('playerHP') || 0;

        // Calculate gold
        const playerGold = winner === 'player' ? GOLD_WINNER : GOLD_LOSER;

        // Award gold
        this.scene.stats.addCoins(playerGold);

        const roundResult: PvpRoundResult = {
            winner,
            playerDamageDealt: this.playerDamageDealt,
            opponentDamageDealt: this.opponentDamageDealt,
            playerHpRemaining: playerHP,
            opponentHpRemaining: 0, // Will be filled by network
            roundDuration,
            playerGold,
            opponentGold: winner === 'player' ? GOLD_LOSER : GOLD_WINNER,
            reason
        };

        this.scene.registry.set('pvpRoundResult', roundResult);
        this.scene.registry.set('pvpOpponentReady', false);
        this.setState('round_end');

        // Broadcast round end if host
        if (this.scene.networkManager?.role === 'host') {
            this.scene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: {
                    type: 'pvp_round_end',
                    data: {
                        winner,
                        reason,
                        score: [...this.score],
                        round: this.currentRound,
                        roundDuration
                    }
                },
                ts: Date.now()
            });
        }

        // Check if match is over
        const winsNeeded = Math.ceil(this.bestOf / 2);
        if (this.score[0] >= winsNeeded || this.score[1] >= winsNeeded) {
            // Match over after brief delay
            this.scene.time.delayedCall(2000, () => {
                this.endMatch();
            });
        }
    }

    private endMatch(): void {
        const matchWinner: 'player' | 'opponent' = this.score[0] > this.score[1] ? 'player' : 'opponent';

        const result: PvpMatchResultData = {
            winner: matchWinner,
            finalScore: [...this.score] as [number, number],
            roundResults: [...this.roundResults]
        };

        this.scene.registry.set('pvpMatchResult', result);
        this.setState('match_end');

        if (this.scene.networkManager?.role === 'host') {
            this.scene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: {
                    type: 'pvp_match_end',
                    data: result
                },
                ts: Date.now()
            });
        }
    }

    /**
     * Called when player clicks "Ready" in the round summary / shop
     */
    public setLocalReady(): void {
        if (this.localReady) return;
        this.localReady = true;

        const trySendReady = () => {
            if (!this.scene.networkManager) {
                this.checkBothReady();
                return;
            }
            if (this.scene.networkManager.getConnectedPeerCount() === 0) {
                // Retry every 500ms until connection opens
                this.scene.time.delayedCall(500, trySendReady);
                return;
            }
            this.scene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'pvp_ready', data: { playerId: this.scene.networkManager.peerId } },
                ts: Date.now()
            });
            this.checkBothReady();
        };

        trySendReady();
    }

    private handleRemoteReady = (_data: any): void => {
        this.remoteReady = true;
        this.scene.registry.set('pvpOpponentReady', true);
        this.checkBothReady();
    };

    private checkBothReady(): void {
        if (this.localReady && this.remoteReady) {
            this.localReady = false;
            this.remoteReady = false;
            this.scene.registry.set('pvpOpponentReady', false);

            // Check if we're ending the match
            const winsNeeded = Math.ceil(this.bestOf / 2);
            if (this.score[0] >= winsNeeded || this.score[1] >= winsNeeded) {
                return; // Match is already over
            }

            if (this.state === 'round_end' || this.state === 'shop') {
                // Advance to next round
                this.currentRound++;
                this.scene.registry.set('pvpRound', this.currentRound);
            }

            this.startCountdown();
        }
    }

    private startCountdown(): void {
        this.setState('countdown');
        this.countdownTimer = COUNTDOWN_DURATION;
        this.timerAccumulator = 0;
        this.scene.registry.set('pvpCountdown', COUNTDOWN_DURATION);

        // Reset player state for new round
        this.resetForNewRound();

        // Schedule synchronized start using NTP time
        if (this.scene.networkManager) {
            const serverTime = this.scene.networkManager.getServerTime();
            this.scheduledStartTime = serverTime + (COUNTDOWN_DURATION * 1000) + 500; // 500ms buffer

            if (this.scene.networkManager.role === 'host') {
                this.scene.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: {
                        type: 'pvp_round_start',
                        data: { startAt: this.scheduledStartTime, round: this.currentRound }
                    },
                    ts: Date.now()
                });
            }
        }
    }

    private handleRoundStart = (data: any): void => {
        if (data.startAt) {
            this.scheduledStartTime = data.startAt;
        }
        if (data.round) {
            this.currentRound = data.round;
            this.scene.registry.set('pvpRound', this.currentRound);
        }

        if (this.state !== 'countdown') {
            this.setState('countdown');
            this.resetForNewRound();
        }
    };

    private handleRemoteRoundEnd = (data: any): void => {
        if (this.state === 'fighting') {
            // Client receives round end from host
            // Invert winner since host perspective is opposite
            const localWinner: 'player' | 'opponent' = data.winner === 'player' ? 'opponent' : 'player';
            this.score = data.score;
            // Invert score for local perspective
            this.score = [data.score[1], data.score[0]] as [number, number];
            this.scene.registry.set('pvpScore', [...this.score]);

            const playerGold = localWinner === 'player' ? GOLD_WINNER : GOLD_LOSER;
            this.scene.stats.addCoins(playerGold);

            this.roundResults.push({ winner: localWinner, reason: data.reason });

            const playerHP = this.scene.registry.get('playerHP') || 0;
            const roundResult: PvpRoundResult = {
                winner: localWinner,
                playerDamageDealt: this.playerDamageDealt,
                opponentDamageDealt: this.opponentDamageDealt,
                playerHpRemaining: playerHP,
                opponentHpRemaining: 0,
                roundDuration: data.roundDuration || 0,
                playerGold,
                opponentGold: localWinner === 'player' ? GOLD_LOSER : GOLD_WINNER,
                reason: data.reason
            };

            this.scene.registry.set('pvpRoundResult', roundResult);
            this.scene.registry.set('pvpFightActive', false);
            this.setState('round_end');
        }
    };

    private handleRemoteMatchEnd = (data: PvpMatchResultData): void => {
        // Invert for local perspective
        const localWinner: 'player' | 'opponent' = data.winner === 'player' ? 'opponent' : 'player';
        const result: PvpMatchResultData = {
            winner: localWinner,
            finalScore: [data.finalScore[1], data.finalScore[0]],
            roundResults: data.roundResults.map(r => ({
                winner: r.winner === 'player' ? 'opponent' as const : 'player' as const,
                reason: r.reason
            }))
        };

        this.scene.registry.set('pvpMatchResult', result);
        this.setState('match_end');
    };

    private resetForNewRound(): void {
        // Reset HP
        this.scene.stats.recalculateStats();
        const maxHP = this.scene.registry.get('playerMaxHP') || 100;
        this.scene.registry.set('playerHP', maxHP);

        // Reset combat state
        this.scene.combat.resetForRestart?.();

        // Teleport to spawn point
        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (player) {
            const isHost = this.scene.networkManager?.role === 'host' || !this.scene.networkManager;
            // Host spawns left, client spawns right
            const spawnX = isHost ? 1200 : 1800;
            const spawnY = 1500;
            player.setPosition(spawnX, spawnY);
            player.setVelocity(0, 0);
        }

        this.playerDamageDealt = 0;
        this.opponentDamageDealt = 0;
        this.scene.registry.set('pvpDamageDealt', 0);
    }

    /**
     * Track damage dealt for round summary
     */
    public trackDamage(isPlayer: boolean, amount: number): void {
        if (isPlayer) {
            this.playerDamageDealt += amount;
        } else {
            this.opponentDamageDealt += amount;
        }
        this.scene.registry.set('pvpDamageDealt', this.playerDamageDealt);
    }

    /**
     * Handle opponent disconnect
     */
    public handleOpponentDisconnect(): void {
        if (this.state === 'match_end') return;

        // Award remaining rounds to local player
        const winsNeeded = Math.ceil(this.bestOf / 2);
        this.score[0] = winsNeeded;
        this.scene.registry.set('pvpScore', [...this.score]);

        const result: PvpMatchResultData = {
            winner: 'player',
            finalScore: [...this.score] as [number, number],
            roundResults: [...this.roundResults],
            disconnected: true
        };

        this.scene.registry.set('pvpMatchResult', result);
        this.scene.registry.set('pvpFightActive', false);
        this.setState('match_end');
    }

    private handleRematch = (): void => {
        this.score = [0, 0];
        this.currentRound = 1;
        this.roundResults = [];
        this.localReady = false;
        this.remoteReady = false;

        this.scene.registry.set('pvpScore', [0, 0]);
        this.scene.registry.set('pvpRound', 1);
        this.scene.registry.set('pvpRoundResult', null);
        this.scene.registry.set('pvpMatchResult', null);
        this.scene.registry.set('playerCoins', 0);
        this.scene.registry.set('upgradeLevels', {});

        this.scene.stats.recalculateStats();
        this.setState('waiting');

        // Auto-ready for rematch
        this.scene.time.delayedCall(500, () => {
            this.setLocalReady();
        });
    };

    /**
     * Trigger rematch (called from UI)
     */
    public requestRematch(): void {
        if (this.scene.networkManager) {
            this.scene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'pvp_rematch', data: {} },
                ts: Date.now()
            });
        }
        this.handleRematch();
    }

    public destroy(): void {
        this.scene.events.off('pvp_ready', this.handleRemoteReady, this);
        this.scene.events.off('pvp_round_start', this.handleRoundStart, this);
        this.scene.events.off('pvp_round_end', this.handleRemoteRoundEnd, this);
        this.scene.events.off('pvp_match_end', this.handleRemoteMatchEnd, this);
        this.scene.events.off('pvp_rematch', this.handleRematch, this);
    }
}
