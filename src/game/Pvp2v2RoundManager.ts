import type { IMainScene } from './IMainScene';
import { PacketType } from '../network/SyncSchemas';
import type { Pvp2v2RoundEndData } from '../network/SyncSchemas';
import { AudioManager } from './AudioManager';

export type Pvp2v2State = 'waiting' | 'countdown' | 'fighting' | 'round_end' | 'shop' | 'match_end';

export interface Pvp2v2RoundResult {
    winnerTeam: 'A' | 'B';
    myTeam: 'A' | 'B';
    reason: 'death' | 'timeout';
    roundDuration: number;
    teamADamage: number;
    teamBDamage: number;
    teamAHpSum: number;
    teamBHpSum: number;
    playerGold: number;
    round: number;
}

export interface Pvp2v2MatchResultData {
    winnerTeam: 'A' | 'B';
    myTeam: 'A' | 'B';
    finalScore: [number, number];
    roundResults: Array<{ winnerTeam: 'A' | 'B'; reason: 'death' | 'timeout' }>;
    disconnected?: boolean;
}

const ROUND_DURATION = 120; // seconds
const COUNTDOWN_DURATION = 3; // seconds
const GOLD_WINNER = 200;
const GOLD_LOSER = 500;

const PVP_BGM_POOL = [
    'dragons_fury', 'pixel_rush_overture', 'glitch_in_the_dungeon',
    'glitch_in_the_catacombs', 'glitch_king', 'final_dungeon_loop', 'glitch_in_the_heavens',
];

const SPAWN_POINTS: Record<string, { x: number; y: number }> = {
    A1: { x: 1050, y: 1350 },
    A2: { x: 1050, y: 1650 },
    B1: { x: 1950, y: 1350 },
    B2: { x: 1950, y: 1650 },
};

/**
 * Manages 2v2 PvP round state machine. Team A vs Team B.
 * Owned by MainScene in pvp2v2 mode.
 */
export class Pvp2v2RoundManager {
    private scene: IMainScene;
    private state: Pvp2v2State = 'waiting';
    private score: [number, number] = [0, 0]; // [scoreA, scoreB]
    private bestOf: number = 5;
    private currentRound: number = 1;
    private roundTimer: number = ROUND_DURATION;
    private countdownTimer: number = COUNTDOWN_DURATION;
    private roundStartTime: number = 0;
    private roundResults: Array<{ winnerTeam: 'A' | 'B'; reason: 'death' | 'timeout' }> = [];

    // Damage dealt per team this round
    private teamADamage: number = 0;
    private teamBDamage: number = 0;

    // Ready tracking — set of peerIds that have signalled ready
    private localReady: boolean = false;
    private readyPeers: Set<string> = new Set();

    // NTP-synced round start
    private scheduledStartTime: number = 0;
    private timerAccumulator: number = 0;

    // Music
    private pvpPlaylist: string[] = [];
    private lastPlayedBGM: string | null = null;

    constructor(scene: IMainScene) {
        this.scene = scene;
    }

    public initialize(): void {
        this.bestOf = this.scene.registry.get('pvpBestOf') || 5;
        this.score = [0, 0];
        this.currentRound = 1;
        this.roundResults = [];

        this.scene.registry.set('pvp2v2Score', this.score);
        this.scene.registry.set('pvp2v2Round', this.currentRound);
        this.scene.registry.set('pvp2v2BestOf', this.bestOf);
        this.scene.registry.set('pvp2v2RoundTimer', ROUND_DURATION);
        this.scene.registry.set('pvp2v2Countdown', 0);
        this.scene.registry.set('pvp2v2RoundResult', null);
        this.scene.registry.set('pvp2v2MatchResult', null);
        this.scene.registry.set('pvp2v2DamageDealt', 0);
        this.scene.registry.set('pvp2v2ReadyCount', 0);
        this.scene.registry.set('pvp2v2FightActive', false);

        this.setState('waiting');

        this.scene.events.on('pvp2v2_ready', this.handleRemoteReady, this);
        this.scene.events.on('pvp2v2_round_start', this.handleRoundStart, this);
        this.scene.events.on('pvp2v2_round_end', this.handleRemoteRoundEnd, this);
        this.scene.events.on('pvp2v2_match_end', this.handleRemoteMatchEnd, this);
        this.scene.events.on('pvp2v2_rematch', this.handleRematch, this);

        // Auto-ready after a short delay
        this.scene.time.delayedCall(1000, () => {
            this.setLocalReady();
        });
    }

    private setState(state: Pvp2v2State): void {
        this.state = state;
        this.scene.registry.set('pvp2v2State', state);
    }

    public getState(): Pvp2v2State {
        return this.state;
    }

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
                this.scheduledStartTime = 0;
                this.startFighting();
                return;
            }

            const countdownVal = Math.ceil(remaining);
            if (countdownVal !== this.countdownTimer) {
                this.countdownTimer = countdownVal;
                this.scene.registry.set('pvp2v2Countdown', countdownVal);
            }
        } else {
            this.timerAccumulator += delta;
            if (this.timerAccumulator >= 1000) {
                this.timerAccumulator -= 1000;
                this.countdownTimer--;
                this.scene.registry.set('pvp2v2Countdown', Math.max(0, this.countdownTimer));
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
            this.scene.registry.set('pvp2v2RoundTimer', Math.max(0, this.roundTimer));
            if (this.roundTimer <= 0) {
                this.handleTimeout();
            }
        }

        // Only host/singleplayer checks win conditions
        if (this.scene.networkManager && this.scene.networkManager.role !== 'host') return;

        const teams = (this.scene.registry.get('pvp2v2Teams') || {}) as Record<string, 'A' | 'B'>;
        const myTeam = this.scene.registry.get('pvp2v2MyTeam') as 'A' | 'B';
        const localHP = this.scene.registry.get('playerHP') || 0;

        let teamAAllDead = true;
        let teamBAllDead = true;

        // Local player
        if (myTeam === 'A') {
            if (localHP > 0) teamAAllDead = false;
        } else {
            if (localHP > 0) teamBAllDead = false;
        }

        // Remote players
        const remotePackets = this.scene.networkPacketHandler?.remotePlayerPackets;
        if (remotePackets) {
            for (const [peerId, packet] of remotePackets) {
                const team = teams[peerId];
                const hp = packet[5] || 0;
                if (team === 'A') {
                    if (hp > 0) teamAAllDead = false;
                } else if (team === 'B') {
                    if (hp > 0) teamBAllDead = false;
                }
            }
        }

        if (teamBAllDead) {
            this.endRound('A', 'death');
        } else if (teamAAllDead) {
            this.endRound('B', 'death');
        }
    }

    private handleTimeout(): void {
        // Only host decides timeout winner
        if (this.scene.networkManager && this.scene.networkManager.role !== 'host') return;

        const teams = (this.scene.registry.get('pvp2v2Teams') || {}) as Record<string, 'A' | 'B'>;
        const myTeam = this.scene.registry.get('pvp2v2MyTeam') as 'A' | 'B';
        const localHP = this.scene.registry.get('playerHP') || 0;

        let teamAHpSum = 0;
        let teamBHpSum = 0;

        if (myTeam === 'A') teamAHpSum += localHP;
        else teamBHpSum += localHP;

        const remotePackets = this.scene.networkPacketHandler?.remotePlayerPackets;
        if (remotePackets) {
            for (const [peerId, packet] of remotePackets) {
                const team = teams[peerId];
                const hp = packet[5] || 0;
                if (team === 'A') teamAHpSum += hp;
                else teamBHpSum += hp;
            }
        }

        const winner: 'A' | 'B' = teamAHpSum >= teamBHpSum ? 'A' : 'B';
        this.endRound(winner, 'timeout');
    }

    private startFighting(): void {
        this.setState('fighting');
        this.roundTimer = ROUND_DURATION;
        this.timerAccumulator = 0;
        this.teamADamage = 0;
        this.teamBDamage = 0;
        this.roundStartTime = Date.now();
        this.scene.registry.set('pvp2v2RoundTimer', ROUND_DURATION);
        this.scene.registry.set('pvp2v2Countdown', 0);
        this.scene.registry.set('pvp2v2FightActive', true);
    }

    private endRound(winnerTeam: 'A' | 'B', reason: 'death' | 'timeout'): void {
        if (this.state !== 'fighting') return;

        this.scene.registry.set('pvp2v2FightActive', false);

        if (winnerTeam === 'A') this.score[0]++;
        else this.score[1]++;
        this.scene.registry.set('pvp2v2Score', [...this.score]);

        this.roundResults.push({ winnerTeam, reason });

        const roundDuration = Math.round((Date.now() - this.roundStartTime) / 1000);
        const myTeam = this.scene.registry.get('pvp2v2MyTeam') as 'A' | 'B';
        const didWin = winnerTeam === myTeam;
        const playerGold = didWin ? GOLD_WINNER : GOLD_LOSER;

        this.scene.stats.addCoins(playerGold);

        // Collect HP sums for result display
        const teams = (this.scene.registry.get('pvp2v2Teams') || {}) as Record<string, 'A' | 'B'>;
        const localHP = this.scene.registry.get('playerHP') || 0;
        let teamAHpSum = myTeam === 'A' ? localHP : 0;
        let teamBHpSum = myTeam === 'B' ? localHP : 0;
        const remotePackets = this.scene.networkPacketHandler?.remotePlayerPackets;
        if (remotePackets) {
            for (const [peerId, packet] of remotePackets) {
                const team = teams[peerId];
                const hp = packet[5] || 0;
                if (team === 'A') teamAHpSum += hp;
                else teamBHpSum += hp;
            }
        }

        const roundResult: Pvp2v2RoundResult = {
            winnerTeam,
            myTeam,
            reason,
            roundDuration,
            teamADamage: this.teamADamage,
            teamBDamage: this.teamBDamage,
            teamAHpSum,
            teamBHpSum,
            playerGold,
            round: this.currentRound,
        };

        this.scene.registry.set('pvp2v2RoundResult', roundResult);
        this.scene.registry.set('pvp2v2ReadyCount', 0);
        this.setState('round_end');

        // Host broadcasts round end
        if (this.scene.networkManager?.role === 'host') {
            const endData: Pvp2v2RoundEndData = {
                winnerTeam,
                reason,
                scoreA: this.score[0],
                scoreB: this.score[1],
                round: this.currentRound,
                roundDuration,
                teamADamage: this.teamADamage,
                teamBDamage: this.teamBDamage,
                teamAHpSum,
                teamBHpSum,
            };
            this.scene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'pvp2v2_round_end', data: endData },
                ts: Date.now()
            });
        }

        // Check match over
        const winsNeeded = Math.ceil(this.bestOf / 2);
        if (this.score[0] >= winsNeeded || this.score[1] >= winsNeeded) {
            this.scene.time.delayedCall(2000, () => this.endMatch());
        }
    }

    private endMatch(): void {
        const myTeam = this.scene.registry.get('pvp2v2MyTeam') as 'A' | 'B';
        const winnerTeam: 'A' | 'B' = this.score[0] > this.score[1] ? 'A' : 'B';

        const result: Pvp2v2MatchResultData = {
            winnerTeam,
            myTeam,
            finalScore: [...this.score] as [number, number],
            roundResults: [...this.roundResults],
        };

        this.scene.registry.set('pvp2v2MatchResult', result);
        this.setState('match_end');

        if (this.scene.networkManager?.role === 'host') {
            this.scene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'pvp2v2_match_end', data: result },
                ts: Date.now()
            });
        }
    }

    /**
     * Called when local player clicks "Klar" in round summary.
     */
    public setLocalReady(): void {
        if (this.localReady) return;
        this.localReady = true;

        const myPeerId = this.scene.networkManager?.peerId || 'local';
        this.readyPeers.add(myPeerId);
        this.scene.registry.set('pvp2v2ReadyCount', this.readyPeers.size);

        const trySendReady = () => {
            if (!this.scene.networkManager) {
                this.checkAllReady();
                return;
            }
            if (this.scene.networkManager.getConnectedPeerCount() === 0) {
                this.scene.time.delayedCall(500, trySendReady);
                return;
            }
            this.scene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'pvp2v2_ready', data: { peerId: myPeerId } },
                ts: Date.now()
            });
            if (this.scene.networkManager.role === 'host') {
                this.checkAllReady();
            }
        };

        trySendReady();
    }

    private handleRemoteReady = (data: any): void => {
        if (data?.peerId) {
            this.readyPeers.add(data.peerId);
            this.scene.registry.set('pvp2v2ReadyCount', this.readyPeers.size);
        }
        // Only host decides when to start countdown
        if (this.scene.networkManager?.role === 'host') {
            this.checkAllReady();
        }
    };

    private checkAllReady(): void {
        const expected = this.scene.networkManager
            ? this.scene.networkManager.getConnectedPeerCount() + 1
            : 1;

        if (this.readyPeers.size >= expected) {
            this.readyPeers.clear();
            this.localReady = false;

            const winsNeeded = Math.ceil(this.bestOf / 2);
            if (this.score[0] >= winsNeeded || this.score[1] >= winsNeeded) return;

            if (this.state === 'round_end' || this.state === 'shop') {
                this.currentRound++;
                this.scene.registry.set('pvp2v2Round', this.currentRound);
            }

            this.startCountdown();
        }
    }

    private pickNextBGM(): string {
        if (this.pvpPlaylist.length === 0) {
            this.pvpPlaylist = Phaser.Utils.Array.Shuffle([...PVP_BGM_POOL]);
            if (this.pvpPlaylist.length > 1 && this.pvpPlaylist[this.pvpPlaylist.length - 1] === this.lastPlayedBGM) {
                const swapIdx = Math.floor(Math.random() * (this.pvpPlaylist.length - 1));
                [this.pvpPlaylist[swapIdx], this.pvpPlaylist[this.pvpPlaylist.length - 1]] =
                    [this.pvpPlaylist[this.pvpPlaylist.length - 1], this.pvpPlaylist[swapIdx]];
            }
        }
        const track = this.pvpPlaylist.pop()!;
        this.lastPlayedBGM = track;
        return track;
    }

    private startCountdown(): void {
        this.setState('countdown');
        this.countdownTimer = COUNTDOWN_DURATION;
        this.timerAccumulator = 0;
        this.scene.registry.set('pvp2v2Countdown', COUNTDOWN_DURATION);

        AudioManager.instance.playBGM(this.pickNextBGM());
        this.resetForNewRound();

        if (this.scene.networkManager) {
            const serverTime = this.scene.networkManager.getServerTime();
            this.scheduledStartTime = serverTime + (COUNTDOWN_DURATION * 1000) + 500;

            if (this.scene.networkManager.role === 'host') {
                this.scene.networkManager.broadcast({
                    t: PacketType.GAME_EVENT,
                    ev: {
                        type: 'pvp2v2_round_start',
                        data: { startAt: this.scheduledStartTime, round: this.currentRound }
                    },
                    ts: Date.now()
                });
            }
        }
    }

    private handleRoundStart = (data: any): void => {
        if (data.startAt) this.scheduledStartTime = data.startAt;
        if (data.round) {
            this.currentRound = data.round;
            this.scene.registry.set('pvp2v2Round', this.currentRound);
        }
        if (this.state !== 'countdown') {
            this.setState('countdown');
            this.resetForNewRound();
        }
    };

    private handleRemoteRoundEnd = (data: Pvp2v2RoundEndData): void => {
        if (this.state !== 'fighting') return;

        const myTeam = this.scene.registry.get('pvp2v2MyTeam') as 'A' | 'B';
        const didWin = data.winnerTeam === myTeam;
        const playerGold = didWin ? GOLD_WINNER : GOLD_LOSER;

        this.score = [data.scoreA, data.scoreB];
        this.scene.registry.set('pvp2v2Score', [...this.score]);
        this.scene.stats.addCoins(playerGold);

        this.roundResults.push({ winnerTeam: data.winnerTeam, reason: data.reason });

        const roundResult: Pvp2v2RoundResult = {
            winnerTeam: data.winnerTeam,
            myTeam,
            reason: data.reason,
            roundDuration: data.roundDuration,
            teamADamage: data.teamADamage,
            teamBDamage: data.teamBDamage,
            teamAHpSum: data.teamAHpSum,
            teamBHpSum: data.teamBHpSum,
            playerGold,
            round: data.round,
        };

        this.scene.registry.set('pvp2v2RoundResult', roundResult);
        this.scene.registry.set('pvp2v2FightActive', false);
        this.scene.registry.set('pvp2v2ReadyCount', 0);
        this.setState('round_end');
    };

    private handleRemoteMatchEnd = (data: Pvp2v2MatchResultData): void => {
        const myTeam = this.scene.registry.get('pvp2v2MyTeam') as 'A' | 'B';
        const result: Pvp2v2MatchResultData = {
            ...data,
            myTeam,
        };
        this.scene.registry.set('pvp2v2MatchResult', result);
        this.setState('match_end');
    };

    private resetForNewRound(): void {
        this.scene.stats.recalculateStats();
        const maxHP = this.scene.registry.get('playerMaxHP') || 100;
        this.scene.registry.set('playerHP', maxHP);
        this.scene.combat.resetForRestart?.();

        const player = this.scene.data.get('player') as Phaser.Physics.Arcade.Sprite;
        if (player) {
            const mySlot = (this.scene.registry.get('pvp2v2MySlot') as string) || 'A1';
            const pos = SPAWN_POINTS[mySlot] || SPAWN_POINTS['A1'];
            player.setPosition(pos.x, pos.y);
            player.setVelocity(0, 0);
        }

        this.teamADamage = 0;
        this.teamBDamage = 0;
        this.scene.registry.set('pvp2v2DamageDealt', 0);
    }

    /**
     * Track damage dealt by team (called from NetworkPacketHandler and CollisionManager).
     */
    public trackTeamDamage(team: 'A' | 'B', amount: number): void {
        if (team === 'A') this.teamADamage += amount;
        else this.teamBDamage += amount;
        const myTeam = this.scene.registry.get('pvp2v2MyTeam') as 'A' | 'B';
        this.scene.registry.set('pvp2v2DamageDealt', myTeam === 'A' ? this.teamADamage : this.teamBDamage);
    }

    /**
     * Handle a player disconnecting mid-match.
     */
    public handleOpponentDisconnect(): void {
        if (this.state === 'match_end') return;

        const myTeam = this.scene.registry.get('pvp2v2MyTeam') as 'A' | 'B';
        const winnerTeam = myTeam;
        const winsNeeded = Math.ceil(this.bestOf / 2);
        if (winnerTeam === 'A') this.score[0] = winsNeeded;
        else this.score[1] = winsNeeded;

        this.scene.registry.set('pvp2v2Score', [...this.score]);
        const result: Pvp2v2MatchResultData = {
            winnerTeam,
            myTeam,
            finalScore: [...this.score] as [number, number],
            roundResults: [...this.roundResults],
            disconnected: true,
        };
        this.scene.registry.set('pvp2v2MatchResult', result);
        this.scene.registry.set('pvp2v2FightActive', false);
        this.setState('match_end');
    }

    private handleRematch = (): void => {
        this.score = [0, 0];
        this.currentRound = 1;
        this.roundResults = [];
        this.localReady = false;
        this.readyPeers.clear();

        this.scene.registry.set('pvp2v2Score', [0, 0]);
        this.scene.registry.set('pvp2v2Round', 1);
        this.scene.registry.set('pvp2v2RoundResult', null);
        this.scene.registry.set('pvp2v2MatchResult', null);
        this.scene.registry.set('playerCoins', 0);
        this.scene.registry.set('upgradeLevels', {});
        this.scene.registry.set('pvp2v2ReadyCount', 0);

        this.scene.stats.recalculateStats();
        this.setState('waiting');

        this.scene.time.delayedCall(500, () => this.setLocalReady());
    };

    public requestRematch(): void {
        if (this.scene.networkManager) {
            this.scene.networkManager.broadcast({
                t: PacketType.GAME_EVENT,
                ev: { type: 'pvp2v2_rematch', data: {} },
                ts: Date.now()
            });
        }
        this.handleRematch();
    }

    public destroy(): void {
        this.scene.events.off('pvp2v2_ready', this.handleRemoteReady, this);
        this.scene.events.off('pvp2v2_round_start', this.handleRoundStart, this);
        this.scene.events.off('pvp2v2_round_end', this.handleRemoteRoundEnd, this);
        this.scene.events.off('pvp2v2_match_end', this.handleRemoteMatchEnd, this);
        this.scene.events.off('pvp2v2_rematch', this.handleRematch, this);
    }
}
