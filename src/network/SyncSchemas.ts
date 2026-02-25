export const PacketType = {
    PLAYER_SYNC: 0,
    ENEMY_SYNC: 1,
    GAME_EVENT: 2,
    COIN_SYNC: 3,
    BOSS_SYNC: 4,
    GAME_STATE: 5
} as const;

export type PacketType = typeof PacketType[keyof typeof PacketType];

export interface PlayerPacket {
    id: string;
    x: number;
    y: number;
    anim: string;
    flipX: boolean;
    hp: number;
    weapon: string;
    name?: string;
}

export interface EnemyPacket {
    id: string;
    x: number;
    y: number;
    hp: number;
    anim: string;
    flipX: boolean;
}

export interface GameEventPacket {
    type: 'attack' | 'spawn' | 'death' | 'upgrade' | 'boss_ability' | 'coin_collect' | 'spawn_coins' | 'level_complete';
    data: any;
}

export interface GameStatePacket {
    level: number;
    wave: number;
    isBossActive: boolean;
    bossIndex?: number;
}

export interface SyncPacket {
    t: PacketType;
    p?: PlayerPacket;    // Single player (client -> host)
    ps?: PlayerPacket[]; // All players (host -> client)
    es?: EnemyPacket[];  // All enemies (host -> client)
    ev?: GameEventPacket;
    gs?: GameStatePacket;
    ts: number;          // Timestamp
}
