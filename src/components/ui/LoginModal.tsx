import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { SyncStatus, type SyncState } from './SyncStatus';
import { FantasyButton } from './FantasyButton';
import { CloudSaveManager } from '../../services/CloudSaveManager';
import { SaveManager } from '../../game/SaveManager';

interface LoginModalProps {
  /** Called after successful login + sync */
  onSyncComplete?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSyncComplete }) => {
  const { user, signIn, signOut, loading: authLoading, error: authError } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Sync profiles on login
  useEffect(() => {
    if (user && !authLoading) {
      performSync();
    } else if (!user) {
      setSyncState('offline');
    }
  }, [user, authLoading]);

  const performSync = async () => {
    if (!user) return;

    setSyncState('syncing');
    setSyncError(null);

    try {
      const localStore = SaveManager.loadProfiles();
      const mergedProfiles = await CloudSaveManager.syncOnLogin(user.uid, localStore.profiles);

      // Update localStorage with merged profiles
      localStore.profiles = mergedProfiles;
      SaveManager.saveProfiles(localStore);

      setSyncState('synced');
      onSyncComplete?.();
    } catch (error: any) {
      console.error('[LoginModal] Sync failed:', error);
      setSyncState('error');
      setSyncError(error.message || 'Synkronisering feilet');
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
      // Sync will be triggered by useEffect when user state updates
    } catch (error) {
      // Error already handled by AuthContext
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSyncState('offline');
    } catch (error) {
      // Error already handled by AuthContext
    }
  };

  const handleRetrySync = () => {
    performSync();
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-amber-900 text-sm">Laster...</div>
      </div>
    );
  }

  // Show logged-in state
  if (user) {
    return (
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* User info */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          {/* User avatar */}
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Bruker'}
              className="w-12 h-12 rounded-full border-2 border-amber-300"
            />
          )}

          {/* User details */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-900 truncate">
              {user.displayName || 'Ukjent bruker'}
            </p>
            <p className="text-sm text-amber-700 truncate">{user.email}</p>
          </div>
        </div>

        {/* Sync status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-amber-200">
          <SyncStatus state={syncState} onRetry={handleRetrySync} />
        </div>

        {/* Sync error message */}
        {syncError && (
          <motion.div
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {syncError}
          </motion.div>
        )}

        {/* Auth error message */}
        {authError && (
          <motion.div
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {authError}
          </motion.div>
        )}

        {/* Sign out button */}
        <FantasyButton
          label="Logg ut"
          variant="secondary"
          onClick={handleSignOut}
          className="w-full !text-black [text-shadow:none]"
        />
      </motion.div>
    );
  }

  // Show sign-in button
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Info text */}
      <div className="text-sm text-amber-800 text-center mb-4">
        Logg inn for å synkronisere karakterene dine på tvers av enheter.
      </div>

      {/* Sign in button */}
      <FantasyButton
        label="🔐 Logg inn med Google"
        variant="primary"
        onClick={handleSignIn}
        className="w-full"
        disabled={authLoading}
      />

      {/* Auth error message */}
      {authError && (
        <motion.div
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 text-center"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          {authError}
        </motion.div>
      )}

      {/* Offline notice */}
      <p className="text-xs text-amber-600 text-center">
        Du kan fortsatt spille offline. Progresjon lagres lokalt på denne enheten.
      </p>
    </motion.div>
  );
};
