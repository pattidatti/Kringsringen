import { getFirestoreInstance } from '../config/firebase';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import type { ParagonProfile } from '../config/paragon';

/**
 * CloudSaveManager: Firestore sync for ParagonProfiles
 *
 * Design principles:
 * - localStorage is always source of truth (offline-first)
 * - Cloud sync is additive and non-blocking
 * - Merge strategy: newest lastPlayedAt timestamp wins per profile
 */

let syncQueue: Promise<void> = Promise.resolve();
let lastSyncTime = 0;
const SYNC_DEBOUNCE_MS = 5000; // Max 1 write per 5 seconds

export class CloudSaveManager {
  /**
   * Upload all profiles to Firestore for a given user
   */
  static async uploadProfiles(userId: string, profiles: ParagonProfile[]): Promise<void> {
    if (!navigator.onLine) {
      console.log('[CloudSaveManager] Offline - skipping upload');
      return;
    }

    try {
      const firestore = getFirestoreInstance();
      const userProfilesRef = collection(firestore, 'users', userId, 'profiles');

      // Upload each profile as a separate document
      const uploadPromises = profiles.map((profile) =>
        setDoc(doc(userProfilesRef, profile.id), this.sanitizeProfile(profile))
      );

      await Promise.all(uploadPromises);

      // Update metadata timestamp
      await setDoc(doc(firestore, 'users', userId, 'metadata', 'sync'), {
        lastSyncedAt: Date.now(),
      });

      console.log(`[CloudSaveManager] Uploaded ${profiles.length} profiles for user ${userId}`);
    } catch (error) {
      console.error('[CloudSaveManager] Upload failed:', error);
      throw new Error('Kunne ikke lagre til skyen. Sjekk internettforbindelsen.');
    }
  }

  /**
   * Download all profiles from Firestore for a given user
   */
  static async downloadProfiles(userId: string): Promise<ParagonProfile[]> {
    if (!navigator.onLine) {
      console.log('[CloudSaveManager] Offline - cannot download');
      return [];
    }

    try {
      const firestore = getFirestoreInstance();
      const userProfilesRef = collection(firestore, 'users', userId, 'profiles');
      const snapshot = await getDocs(userProfilesRef);

      const profiles: ParagonProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (this.validateProfile(data)) {
          profiles.push(data as ParagonProfile);
        } else {
          console.warn(`[CloudSaveManager] Invalid profile data for ${doc.id}, skipping`);
        }
      });

      console.log(`[CloudSaveManager] Downloaded ${profiles.length} profiles for user ${userId}`);
      return profiles;
    } catch (error) {
      console.error('[CloudSaveManager] Download failed:', error);
      throw new Error('Kunne ikke laste ned fra skyen.');
    }
  }

  /**
   * Sync on login: merge cloud and local profiles
   * Strategy: For each profile ID, keep the version with newest lastPlayedAt
   */
  static async syncOnLogin(
    userId: string,
    localProfiles: ParagonProfile[]
  ): Promise<ParagonProfile[]> {
    try {
      const cloudProfiles = await this.downloadProfiles(userId);
      const merged = this.mergeProfiles(localProfiles, cloudProfiles);

      // Upload merged result back to cloud (to sync any local-only profiles)
      await this.uploadProfiles(userId, merged);

      console.log(
        `[CloudSaveManager] Sync complete: ${merged.length} profiles (${localProfiles.length} local, ${cloudProfiles.length} cloud)`
      );
      return merged;
    } catch (error) {
      console.error('[CloudSaveManager] Sync on login failed:', error);
      // Fallback: use local profiles if sync fails
      return localProfiles;
    }
  }

  /**
   * Debounced sync: queues a sync operation to avoid Firestore write storms
   */
  static queueSync(userId: string, profiles: ParagonProfile[]): void {
    const now = Date.now();
    if (now - lastSyncTime < SYNC_DEBOUNCE_MS) {
      console.log('[CloudSaveManager] Debouncing sync...');
      return;
    }

    lastSyncTime = now;

    // Chain sync operations to avoid race conditions
    syncQueue = syncQueue
      .then(() => this.uploadProfiles(userId, profiles))
      .catch((err) => {
        console.error('[CloudSaveManager] Queued sync failed:', err);
        // Don't block future syncs on error
      });
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Merge profiles from two sources (local and cloud).
   * For each profile ID, keep the one with newest lastPlayedAt.
   */
  private static mergeProfiles(
    local: ParagonProfile[],
    cloud: ParagonProfile[]
  ): ParagonProfile[] {
    const merged = new Map<string, ParagonProfile>();

    // Add all profiles to map, with conflict resolution
    [...local, ...cloud].forEach((profile) => {
      const existing = merged.get(profile.id);
      if (!existing || profile.lastPlayedAt > existing.lastPlayedAt) {
        merged.set(profile.id, profile);
      }
    });

    return Array.from(merged.values()).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  }

  /**
   * Sanitize profile before uploading (remove undefined fields)
   */
  private static sanitizeProfile(profile: ParagonProfile): Record<string, any> {
    const sanitized: Record<string, any> = {};
    Object.entries(profile).forEach(([key, value]) => {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    });
    return sanitized;
  }

  /**
   * Validate that a Firestore document matches ParagonProfile schema
   */
  private static validateProfile(data: any): boolean {
    if (!data || typeof data !== 'object') return false;

    // Required fields
    const requiredFields = [
      'id',
      'name',
      'classId',
      'paragonLevel',
      'currentGameLevel',
      'coins',
      'createdAt',
      'lastPlayedAt',
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        console.warn(`[CloudSaveManager] Missing required field: ${field}`);
        return false;
      }
    }

    // Type checks
    if (typeof data.id !== 'string') return false;
    if (typeof data.name !== 'string') return false;
    if (typeof data.paragonLevel !== 'number') return false;
    if (typeof data.coins !== 'number') return false;

    return true;
  }
}
