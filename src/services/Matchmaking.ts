import {
    ref,
    set,
    get,
    onValue,
    off,
    remove,
    serverTimestamp
} from 'firebase/database';
import { initializeFirebase } from '../config/firebase';

export interface RoomData {
    hostId: string;
    hostName: string;
    players: Record<string, { name: string; peerId: string }>;
    status: 'lobby' | 'playing';
    createdAt: any;
}

export class MatchmakingService {
    private static ROOMS_PATH = 'rooms';

    /**
     * Genererer en tilfeldig 4-tegns rom-kode
     */
    static generateRoomCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Unngår O, 0, I, 1 for lesbarhet
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Oppretter et nytt rom
     */
    static async createRoom(hostName: string, hostPeerId: string): Promise<string> {
        const db = initializeFirebase();
        let roomCode = this.generateRoomCode();

        // Sjekk om koden allerede er i bruk (svært lite sannsynlig, men god praksis)
        const existing = await get(ref(db, `${this.ROOMS_PATH}/${roomCode}`));
        if (existing.exists()) {
            roomCode = this.generateRoomCode();
        }

        const roomData: RoomData = {
            hostId: hostPeerId,
            hostName: hostName,
            players: {
                [hostPeerId]: { name: hostName, peerId: hostPeerId }
            },
            status: 'lobby',
            createdAt: serverTimestamp()
        };

        await set(ref(db, `${this.ROOMS_PATH}/${roomCode}`), roomData);
        return roomCode;
    }

    /**
     * Joiner et eksisterende rom
     */
    static async joinRoom(roomCode: string, playerName: string, playerPeerId: string): Promise<RoomData> {
        const db = initializeFirebase();
        const roomRef = ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}`);
        const snapshot = await get(roomRef);

        if (!snapshot.exists()) {
            throw new Error('Rommet finnes ikke.');
        }

        const roomData = snapshot.val() as RoomData;

        if (roomData.status !== 'lobby') {
            throw new Error('Spillet har allerede startet.');
        }

        if (Object.keys(roomData.players || {}).length >= 4) {
            throw new Error('Rommet er fullt (maks 4 spillere).');
        }

        // Legg til spilleren
        await set(ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}/players/${playerPeerId}`), {
            name: playerName,
            peerId: playerPeerId
        });

        return roomData;
    }

    /**
     * Lytter på endringer i et rom (f.eks. nye spillere)
     */
    static subscribeToRoom(roomCode: string, callback: (data: RoomData | null) => void) {
        const db = initializeFirebase();
        const roomRef = ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}`);

        onValue(roomRef, (snapshot) => {
            callback(snapshot.val());
        });

        return () => off(roomRef);
    }

    /**
     * Sletter rommet (når Host forlater)
     */
    static async deleteRoom(roomCode: string) {
        const db = initializeFirebase();
        await remove(ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}`));
    }

    /**
     * Oppdaterer status til 'playing'
     */
    static async startMatch(roomCode: string) {
        const db = initializeFirebase();
        await set(ref(db, `${this.ROOMS_PATH}/${roomCode.toUpperCase()}/status`), 'playing');
    }
}
