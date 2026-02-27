import { type PackedPlayer, type PackedEnemy, PacketType } from './SyncSchemas';

/**
 * BinaryPacker
 * Provides utilities to pack/unpack game state arrays into compact Uint8Arrays.
 * Optimized for Kringsringen's networking schema.
 */
export class BinaryPacker {
    private static encoder = new TextEncoder();
    private static decoder = new TextDecoder();

    /**
     * Packs a list of PackedEnemy into a Uint8Array.
     * Schema: [type(u8), timestamp(f64), count(u16), ...enemies]
     */
    public static packEnemies(enemies: PackedEnemy[], ts: number): Uint8Array {
        const buffer = new ArrayBuffer(enemies.length * 64 + 13);
        const view = new DataView(buffer);
        let offset = 0;

        view.setUint8(offset++, PacketType.ENEMY_SYNC_BIN);
        view.setFloat64(offset, ts);
        offset += 8;

        view.setUint16(offset, enemies.length);
        offset += 2;

        for (const enemy of enemies) {
            const [id, x, y, hp, anim, flipX] = enemy;

            const idBytes = this.encoder.encode(id);
            view.setUint8(offset++, idBytes.length);
            for (let i = 0; i < idBytes.length; i++) view.setUint8(offset++, idBytes[i]);

            view.setInt16(offset, Math.round(x)); offset += 2;
            view.setInt16(offset, Math.round(y)); offset += 2;
            view.setInt16(offset, Math.round(hp)); offset += 2;

            const animBytes = this.encoder.encode(anim);
            view.setUint8(offset++, animBytes.length);
            for (let i = 0; i < animBytes.length; i++) view.setUint8(offset++, animBytes[i]);

            view.setUint8(offset++, flipX);
        }

        return new Uint8Array(buffer, 0, offset);
    }

    public static unpackEnemies(data: Uint8Array): { enemies: PackedEnemy[], ts: number } {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        let offset = 0;

        const type = view.getUint8(offset++);
        if (type !== PacketType.ENEMY_SYNC_BIN) {
            console.warn("[BinaryPacker] Invalid packet type for unpackEnemies:", type);
        }

        const ts = view.getFloat64(offset);
        offset += 8;

        const count = view.getUint16(offset);
        offset += 2;

        const enemies: PackedEnemy[] = [];
        for (let i = 0; i < count; i++) {
            const idLen = view.getUint8(offset++);
            const id = this.decoder.decode(data.subarray(offset, offset + idLen));
            offset += idLen;

            const x = view.getInt16(offset); offset += 2;
            const y = view.getInt16(offset); offset += 2;
            const hp = view.getInt16(offset); offset += 2;

            const animLen = view.getUint8(offset++);
            const anim = this.decoder.decode(data.subarray(offset, offset + animLen));
            offset += animLen;

            const flipX = view.getUint8(offset++) as 0 | 1;

            enemies.push([id, x, y, hp, anim, flipX]);
        }
        return { enemies, ts };
    }

    /**
     * Packs a list of PackedPlayer into a Uint8Array.
     * Schema: [type(u8), timestamp(f64), count(u16), ...players]
     */
    public static packPlayers(players: PackedPlayer[], ts: number): Uint8Array {
        const buffer = new ArrayBuffer(players.length * 160 + 13);
        const view = new DataView(buffer);
        let offset = 0;

        view.setUint8(offset++, PacketType.PLAYER_SYNC_BIN);
        view.setFloat64(offset, ts);
        offset += 8;

        view.setUint16(offset, players.length);
        offset += 2;

        for (const player of players) {
            const [id, x, y, anim, flipX, hp, weapon, name] = player;

            const idBytes = this.encoder.encode(id);
            view.setUint8(offset++, idBytes.length);
            for (let i = 0; i < idBytes.length; i++) view.setUint8(offset++, idBytes[i]);

            view.setInt16(offset, Math.round(x)); offset += 2;
            view.setInt16(offset, Math.round(y)); offset += 2;

            const animBytes = this.encoder.encode(anim);
            view.setUint8(offset++, animBytes.length);
            for (let i = 0; i < animBytes.length; i++) view.setUint8(offset++, animBytes[i]);

            view.setUint8(offset++, flipX);
            view.setInt16(offset, Math.round(hp)); offset += 2;

            const weaponBytes = this.encoder.encode(weapon);
            view.setUint8(offset++, weaponBytes.length);
            for (let i = 0; i < weaponBytes.length; i++) view.setUint8(offset++, weaponBytes[i]);

            const nameStr = name || '';
            const nameBytes = this.encoder.encode(nameStr);
            view.setUint8(offset++, nameBytes.length);
            for (let i = 0; i < nameBytes.length; i++) view.setUint8(offset++, nameBytes[i]);
        }

        return new Uint8Array(buffer, 0, offset);
    }

    public static unpackPlayers(data: Uint8Array): { players: PackedPlayer[], ts: number } {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        let offset = 0;

        const type = view.getUint8(offset++);
        if (type !== PacketType.PLAYER_SYNC_BIN) {
            console.warn("[BinaryPacker] Invalid packet type for unpackPlayers:", type);
        }

        const ts = view.getFloat64(offset);
        offset += 8;

        const count = view.getUint16(offset);
        offset += 2;

        const players: PackedPlayer[] = [];
        for (let i = 0; i < count; i++) {
            const idLen = view.getUint8(offset++);
            const id = this.decoder.decode(data.subarray(offset, offset + idLen));
            offset += idLen;

            const x = view.getInt16(offset); offset += 2;
            const y = view.getInt16(offset); offset += 2;

            const animLen = view.getUint8(offset++);
            const anim = this.decoder.decode(data.subarray(offset, offset + animLen));
            offset += animLen;

            const flipX = view.getUint8(offset++) as 0 | 1;
            const hp = view.getInt16(offset); offset += 2;

            const weaponLen = view.getUint8(offset++);
            const weapon = this.decoder.decode(data.subarray(offset, offset + weaponLen));
            offset += weaponLen;

            const nameLen = view.getUint8(offset++);
            const name = this.decoder.decode(data.subarray(offset, offset + nameLen));
            offset += nameLen;

            players.push([id, x, y, anim, flipX, hp, weapon, name]);
        }
        return { players, ts };
    }

    /**
     * Packs a single PackedPlayer (usually for Client -> Host).
     * Schema: [type(u8), timestamp(f64), len(id), id, x(i16), y(i16), len(anim), anim, flipX(u8), hp(i16), len(weapon), weapon, len(name), name]
     */
    public static packPlayer(player: PackedPlayer, ts: number): Uint8Array {
        // Reuse packPlayers with single element for simplicity and consistency
        return this.packPlayers([player], ts);
    }

    public static unpackPlayer(data: Uint8Array): { player: PackedPlayer, ts: number } {
        const { players, ts } = this.unpackPlayers(data);
        return { player: players[0], ts };
    }
}
