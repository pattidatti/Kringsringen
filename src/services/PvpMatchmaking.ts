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
    onDisconnect,
    push
} from 'firebase/database';
import { initializeFirebase } from '../config/firebase';

export interface PvpPlayerEntry {
    name: string;
    peerId: string;
    classId: string;
    status: 'available' | 'in_match';
    lastSeen: any; // serverTimestamp
}

export interface PvpChallenge {
    challengerId: string;
    challengerName: string;
    challengerPeerId: string;
    targetId: string;
    targetName: string;
    bestOf: 3 | 5 | 7 | 10;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: any;
}

export class PvpMatchmakingService {
    private static PLAYERS_PATH = 'pvp/players';
    private static CHALLENGES_PATH = 'pvp/challenges';

    /**
     * Registrerer en spiller i PVP-lobbyen
     */
    static async registerPlayer(name: string, peerId: string, classId: string): Promise<void> {
        const db = initializeFirebase();
        const playerRef = ref(db, `${this.PLAYERS_PATH}/${peerId}`);

        const entry: PvpPlayerEntry = {
            name,
            peerId,
            classId,
            status: 'available',
            lastSeen: serverTimestamp()
        };

        // Auto-cleanup ved disconnect
        await onDisconnect(playerRef).remove();
        await set(playerRef, entry);
    }

    /**
     * Fjerner spilleren fra PVP-lobbyen
     */
    static async unregisterPlayer(peerId: string): Promise<void> {
        const db = initializeFirebase();
        await remove(ref(db, `${this.PLAYERS_PATH}/${peerId}`));
    }

    /**
     * Oppdaterer spillerens klasse
     */
    static async updatePlayerClass(peerId: string, classId: string): Promise<void> {
        const db = initializeFirebase();
        await set(ref(db, `${this.PLAYERS_PATH}/${peerId}/classId`), classId);
    }

    /**
     * Lytter på alle tilgjengelige PVP-spillere
     */
    static subscribeToPlayers(callback: (players: Record<string, PvpPlayerEntry>) => void) {
        const db = initializeFirebase();
        const playersQuery = query(
            ref(db, this.PLAYERS_PATH),
            orderByChild('status'),
            equalTo('available'),
            limitToLast(50)
        );

        onValue(playersQuery, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            } else {
                callback({});
            }
        });

        return () => off(playersQuery);
    }

    /**
     * Sender en utfordring til en annen spiller
     */
    static async sendChallenge(
        challengerPeerId: string,
        challengerName: string,
        targetPeerId: string,
        targetName: string,
        bestOf: 3 | 5 | 7 | 10
    ): Promise<string> {
        const db = initializeFirebase();
        const challengeRef = push(ref(db, this.CHALLENGES_PATH));
        const challengeId = challengeRef.key!;

        const challenge: PvpChallenge = {
            challengerId: challengerPeerId,
            challengerName,
            challengerPeerId,
            targetId: targetPeerId,
            targetName,
            bestOf,
            status: 'pending',
            createdAt: serverTimestamp()
        };

        // Auto-cleanup ved disconnect
        await onDisconnect(challengeRef).remove();
        await set(challengeRef, challenge);
        return challengeId;
    }

    /**
     * Lytter etter utfordringer rettet mot denne spilleren
     */
    static subscribeToChallenges(myPeerId: string, callback: (challenges: Record<string, PvpChallenge>) => void) {
        const db = initializeFirebase();
        const challengesQuery = query(
            ref(db, this.CHALLENGES_PATH),
            orderByChild('targetId'),
            equalTo(myPeerId),
            limitToLast(10)
        );

        onValue(challengesQuery, (snapshot) => {
            if (snapshot.exists()) {
                const all = snapshot.val() as Record<string, PvpChallenge>;
                // Filtrer kun pending
                const pending: Record<string, PvpChallenge> = {};
                for (const [id, ch] of Object.entries(all)) {
                    if (ch.status === 'pending') {
                        pending[id] = ch;
                    }
                }
                callback(pending);
            } else {
                callback({});
            }
        });

        return () => off(challengesQuery);
    }

    /**
     * Lytter på en spesifikk utfordring (for utfordreren å vite om den ble akseptert)
     */
    static subscribeToChallenge(challengeId: string, callback: (challenge: PvpChallenge | null) => void) {
        const db = initializeFirebase();
        const challengeRef = ref(db, `${this.CHALLENGES_PATH}/${challengeId}`);

        onValue(challengeRef, (snapshot) => {
            callback(snapshot.exists() ? snapshot.val() : null);
        });

        return () => off(challengeRef);
    }

    /**
     * Svarer på en utfordring
     */
    static async respondToChallenge(challengeId: string, accept: boolean): Promise<void> {
        const db = initializeFirebase();
        await set(
            ref(db, `${this.CHALLENGES_PATH}/${challengeId}/status`),
            accept ? 'accepted' : 'rejected'
        );
    }

    /**
     * Fjerner en utfordring
     */
    static async removeChallenge(challengeId: string): Promise<void> {
        const db = initializeFirebase();
        await remove(ref(db, `${this.CHALLENGES_PATH}/${challengeId}`));
    }

    /**
     * Markerer spiller som i kamp
     */
    static async setPlayerInMatch(peerId: string): Promise<void> {
        const db = initializeFirebase();
        await set(ref(db, `${this.PLAYERS_PATH}/${peerId}/status`), 'in_match');
    }

    /**
     * Rydder opp alle utfordringer for en spiller
     */
    static async cleanupPlayerChallenges(peerId: string): Promise<void> {
        const db = initializeFirebase();
        const snapshot = await get(ref(db, this.CHALLENGES_PATH));
        if (snapshot.exists()) {
            const all = snapshot.val() as Record<string, PvpChallenge>;
            for (const [id, ch] of Object.entries(all)) {
                if (ch.challengerId === peerId || ch.targetId === peerId) {
                    await remove(ref(db, `${this.CHALLENGES_PATH}/${id}`));
                }
            }
        }
    }
}
