import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  push,
  query,
  orderByChild,
  limitToLast,
  onValue,
  type Unsubscribe,
} from 'firebase/database';

export interface Highscore {
  id: string;
  name: string;
  score: number;
  level: number;
  wave: number;
  coins: number;
  timestamp: number;
}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Lazy-initialize Firebase on first use (prevents blocking app startup)
let app: any = null;
let database: any = null;

export function initializeFirebase() {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
    } catch (error) {
      console.error('[Firebase] Initialization failed:', error);
      throw error;
    }
  }
  return database;
}

export class HighscoreManager {
  /**
   * Submit a score to Firebase
   */
  static async submitScore(
    name: string,
    score: number,
    level: number,
    wave: number,
    coins: number
  ): Promise<void> {
    try {
      const validation = this.validateScore(name, score);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid score data');
      }

      const db = initializeFirebase();
      const highscoresRef = ref(db, 'highscores');
      const timestamp = Date.now();

      // Push new highscore entry
      await push(highscoresRef, {
        name: name.trim(),
        score,
        level,
        wave,
        coins,
        timestamp,
      });

      console.log('Score submitted successfully:', { name, score, level, wave, coins });
    } catch (error) {
      console.error('Failed to submit score:', error);
      const message = error instanceof Error ? error.message : 'Kunne ikke lagre poengsum. Prøv igjen.';
      throw new Error(message);
    }
  }

  /**
   * Fetch top 25 highscores
   */
  static async fetchHighscores(limit: number = 25): Promise<Highscore[]> {
    try {
      const db = initializeFirebase();
      const highscoresRef = ref(db, 'highscores');
      const q = query(
        highscoresRef,
        orderByChild('score'),
        limitToLast(limit)
      );

      return new Promise((resolve, reject) => {
        onValue(
          q,
          (snapshot) => {
            const data = snapshot.val();
            const scores: Highscore[] = [];

            if (data) {
              // Convert Firebase object to array and reverse for descending order
              Object.entries(data).forEach(([key, value]) => {
                const v = value as Record<string, unknown>;
                scores.push({
                  id: key,
                  name: (v.name as string) || 'Ukjent',
                  score: (v.score as number) || 0,
                  level: (v.level as number) || 0,
                  wave: (v.wave as number) || 0,
                  coins: (v.coins as number) || 0,
                  timestamp: (v.timestamp as number) || 0,
                });
              });
            }

            // Sort by score descending (Firebase orderByChild doesn't sort in real-time reliably)
            scores.sort((a, b) => b.score - a.score);

            resolve(scores);
          },
          (error) => {
            console.error('Failed to fetch highscores:', error);
            reject(new Error('Kunne ikke laste inn poengsum.'));
          }
        );
      });
    } catch (error) {
      console.error('Error in fetchHighscores:', error);
      throw new Error('Kunne ikke laste inn poengsum.');
    }
  }

  /**
   * Subscribe to real-time highscore updates
   * Returns unsubscribe function to cleanup listener
   */
  static subscribeToHighscores(callback: (scores: Highscore[]) => void): Unsubscribe {
    try {
      const db = initializeFirebase();
      const highscoresRef = ref(db, 'highscores');

      const unsubscribe = onValue(
        highscoresRef,
        (snapshot) => {
          const data = snapshot.val();
          const scores: Highscore[] = [];

          if (data) {
            Object.entries(data).forEach(([key, value]) => {
              const v = value as Record<string, unknown>;
              scores.push({
                id: key,
                name: (v.name as string) || 'Ukjent',
                score: (v.score as number) || 0,
                level: (v.level as number) || 0,
                wave: (v.wave as number) || 0,
                coins: (v.coins as number) || 0,
                timestamp: (v.timestamp as number) || 0,
              });
            });
          }

          // Sort by score descending, then by timestamp ascending (for ties)
          scores.sort((a, b) => {
            if (b.score !== a.score) {
              return b.score - a.score;
            }
            return a.timestamp - b.timestamp;
          });

          callback(scores);
        },
        (error) => {
          console.error('Realtime listener error:', error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up subscription:', error);
      return () => { };
    }
  }

  /**
   * Validate score data before submission
   */
  static validateScore(name: string, score: number): { valid: boolean; error?: string } {
    if (!name || !name.trim()) {
      return { valid: false, error: 'Navn kan ikke være tomt' };
    }

    if (name.trim().length > 20) {
      return { valid: false, error: 'Navn kan ikke være lengre enn 20 tegn' };
    }

    if (typeof score !== 'number' || score < 0) {
      return { valid: false, error: 'Score må være et positivt tall' };
    }

    return { valid: true };
  }
}
