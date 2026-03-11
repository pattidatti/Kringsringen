import {
    ref,
    set,
    get,
    onValue,
    off,
    remove,
    serverTimestamp,
    query,
    orderByChild,
    equalTo,
    limitToLast,
    onDisconnect
} from 'firebase/database';
import { initializeFirebase } from '../config/firebase';
import type { ClassId } from '../config/classes';

export interface Pvp2v2Slot {
    peerId: string;
    name: string;
    classId: ClassId;
    team: 'A' | 'B';
    ready: boolean;
}

export type Pvp2v2SlotId = 'A1' | 'A2' | 'B1' | 'B2';

export interface Pvp2v2Room {
    hostPeerId: string;
    hostName: string;
    bestOf: 3 | 5 | 7 | 10;
    status: 'waiting' | 'in_match';
    createdAt: any;
    slots: {
        A1: Pvp2v2Slot | null;
        A2: Pvp2v2Slot | null;
        B1: Pvp2v2Slot | null;
        B2: Pvp2v2Slot | null;
    };
}

export class Pvp2v2MatchmakingService {
    private static ROOMS_PATH = 'pvp2v2/rooms';

    static generateRoomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Create a new 2v2 room. Host is auto-assigned to slot A1.
     */
    static async createRoom(
        hostName: string,
        hostPeerId: string,
        hostClassId: ClassId,
        bestOf: 3 | 5 | 7 | 10 = 5
    ): Promise<string> {
        const db = initializeFirebase();
        let roomCode = this.generateRoomCode();

        const existing = await get(ref(db, `${this.ROOMS_PATH}/${roomCode}`));
        if (existing.exists()) {
            roomCode = this.generateRoomCode();
        }

        const roomData: Pvp2v2Room = {
            hostPeerId,
            hostName,
            bestOf,
            status: 'waiting',
            createdAt: serverTimestamp(),
            slots: {
                A1: { peerId: hostPeerId, name: hostName, classId: hostClassId, team: 'A', ready: false },
                A2: null,
                B1: null,
                B2: null,
            }
        };

        const roomRef = ref(db, `${this.ROOMS_PATH}/${roomCode}`);
        await onDisconnect(roomRef).remove();
        await set(roomRef, roomData);
        return roomCode;
    }

    /**
     * Join a room. Finds first available slot based on team preference.
     * Returns the assigned slotId and current room data.
     */
    static async joinRoom(
        roomCode: string,
        playerName: string,
        playerPeerId: string,
        playerClassId: ClassId,
        teamPreference: 'A' | 'B' = 'A'
    ): Promise<{ slotId: Pvp2v2SlotId; room: Pvp2v2Room }> {
        const db = initializeFirebase();
        const code = roomCode.toUpperCase();
        const roomRef = ref(db, `${this.ROOMS_PATH}/${code}`);
        const snapshot = await get(roomRef);

        if (!snapshot.exists()) throw new Error('Rommet finnes ikke.');

        const room = snapshot.val() as Pvp2v2Room;

        if (room.status !== 'waiting') throw new Error('Kampen har allerede startet.');

        // Prefer the requested team, fall back to other team
        const preferredSlots: Pvp2v2SlotId[] = teamPreference === 'A'
            ? ['A2', 'A1', 'B1', 'B2']
            : ['B1', 'B2', 'A2', 'A1'];

        let chosenSlot: Pvp2v2SlotId | null = null;
        for (const slotId of preferredSlots) {
            if (room.slots[slotId] === null) {
                chosenSlot = slotId;
                break;
            }
        }
        if (!chosenSlot) throw new Error('Rommet er fullt.');

        const team: 'A' | 'B' = chosenSlot.startsWith('A') ? 'A' : 'B';
        const slotData: Pvp2v2Slot = {
            peerId: playerPeerId,
            name: playerName,
            classId: playerClassId,
            team,
            ready: false
        };

        await set(ref(db, `${this.ROOMS_PATH}/${code}/slots/${chosenSlot}`), slotData);
        return { slotId: chosenSlot, room };
    }

    /**
     * Toggle ready state for a slot.
     */
    static async setSlotReady(roomCode: string, slotId: Pvp2v2SlotId, ready: boolean): Promise<void> {
        const db = initializeFirebase();
        await set(ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}/slots/${slotId}/ready`), ready);
    }

    /**
     * Update class for a slot (called when player changes class while in room).
     */
    static async updateSlotClass(roomCode: string, slotId: Pvp2v2SlotId, classId: ClassId): Promise<void> {
        const db = initializeFirebase();
        await set(ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}/slots/${slotId}/classId`), classId);
    }

    /**
     * Start the match (host only — sets status to in_match).
     */
    static async startMatch(roomCode: string): Promise<void> {
        const db = initializeFirebase();
        await set(ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}/status`), 'in_match');
    }

    /**
     * Subscribe to room changes.
     */
    static subscribeToRoom(roomCode: string, callback: (data: Pvp2v2Room | null) => void): () => void {
        const db = initializeFirebase();
        const roomRef = ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}`);
        onValue(roomRef, (snapshot) => callback(snapshot.val()));
        return () => off(roomRef);
    }

    /**
     * List open waiting rooms.
     */
    static subscribeToOpenRooms(callback: (rooms: Record<string, Pvp2v2Room>) => void): () => void {
        const db = initializeFirebase();
        const q = query(
            ref(db, this.ROOMS_PATH),
            orderByChild('status'),
            equalTo('waiting'),
            limitToLast(20)
        );
        onValue(q, (snapshot) => callback(snapshot.exists() ? snapshot.val() : {}));
        return () => off(q);
    }

    /**
     * Remove a player's slot when they leave.
     */
    static async leaveSlot(roomCode: string, slotId: Pvp2v2SlotId): Promise<void> {
        const db = initializeFirebase();
        await set(ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}/slots/${slotId}`), null);
    }

    /**
     * Delete the entire room (host only).
     */
    static async deleteRoom(roomCode: string): Promise<void> {
        const db = initializeFirebase();
        await remove(ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}`));
    }
}
