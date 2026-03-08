import React from 'react';
import { motion } from 'framer-motion';

export type SyncState = 'synced' | 'syncing' | 'error' | 'offline';

interface SyncStatusProps {
  state: SyncState;
  /** Optional compact mode (icon only, no label) */
  compact?: boolean;
  /** Optional retry callback for error state */
  onRetry?: () => void;
}

const stateConfig: Record<
  SyncState,
  { icon: string; label: string; color: string; bgColor: string }
> = {
  synced: {
    icon: '✓',
    label: 'Synkronisert',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  syncing: {
    icon: '⟳',
    label: 'Synkroniserer...',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  error: {
    icon: '✕',
    label: 'Feilet',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  offline: {
    icon: '⚪',
    label: 'Offline',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
};

export const SyncStatus: React.FC<SyncStatusProps> = ({ state, compact = false, onRetry }) => {
  const config = stateConfig[state];

  return (
    <div className="flex items-center gap-2">
      {/* Icon indicator */}
      <motion.div
        className={`flex items-center justify-center w-6 h-6 rounded-full ${config.bgColor} ${config.color}`}
        animate={state === 'syncing' ? { rotate: 360 } : {}}
        transition={
          state === 'syncing'
            ? { repeat: Infinity, duration: 1, ease: 'linear' }
            : { duration: 0.2 }
        }
      >
        <span className="text-sm font-bold">{config.icon}</span>
      </motion.div>

      {/* Label (hidden in compact mode) */}
      {!compact && (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>

          {/* Retry button for error state */}
          {state === 'error' && onRetry && (
            <button
              onClick={onRetry}
              className="text-xs underline text-red-700 hover:text-red-900 transition-colors"
            >
              Prøv igjen
            </button>
          )}
        </div>
      )}
    </div>
  );
};
