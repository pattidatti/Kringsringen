export const PacketType = {
    PLAYER_SYNC: 0,
    ENEMY_SYNC: 1,
    GAME_EVENT: 2,
    COIN_SYNC: 3,
    BOSS_SYNC: 4,
    GAME_STATE: 5,
    PING: 6,
    PONG: 7
} as const;

export type PacketType = typeof PacketType[keyof typeof PacketType];

// [id, x, y, anim, flipX(1|0), hp, weapon, name]
export type PackedPlayer = [string, number, number, string, number, number, string, string?];

// [id, x, y, hp, anim, flipX(1|0)]
export type PackedEnemy = [string, number, number, number, string, number];

export interface GameEventPacket {
    type: 'attack' | 'spawn' | 'death' | 'upgrade' | 'boss_ability' | 'coin_collect' | 'spawn_coins' | 'level_complete' | 'hit_request' | 'hit_confirm' | 'projectile_hit_request' | 'enemy_death' | 'damage_player' | 'sync_pause' | 'player_loaded' | 'player_ready' | 'start_level' | 'resume_game' | 'sync_players_state' | 'revive_request' | 'player_revived' | 'party_dead' | 'restart_game' | 'spawn_enemy_projectile';
    data: any;
}

export interface GameStatePacket {
    level: number;
    wave: number;
    isBossActive: boolean;
    bossIndex?: number;
}

export interface PingPacket {
    clientTime: number;
}

export interface PongPacket {
    clientTime: number;
    serverTime: number;
}

export interface SyncPacket {
    t: PacketType;
    p?: PackedPlayer;    // Single player (client -> host)
    ps?: PackedPlayer[]; // All players (host -> client)
    es?: PackedEnemy[];  // All enemies (host -> client)
    ev?: GameEventPacket;
    gs?: GameStatePacket;
    pi?: PingPacket;     // NTP Ping (client -> host)
    po?: PongPacket;     // NTP Pong (host -> client)
    ts: number;          // Timestamp
}
