
import { useState, useCallback, useEffect, useRef } from 'react'
import { GameContainer } from './components/GameContainer'
import LandingPage from './components/LandingPage'
import FantasyDemo from './components/ui/FantasyDemo'
import { FantasyButton } from './components/ui/FantasyButton'
import { FantasyDebug } from './components/dev/FantasyDebug'
import { ClassSelector } from './components/ui/ClassSelector'
import { PvpLobby } from './components/ui/PvpLobby'
import { CharacterSelectScreen } from './components/ui/CharacterSelectScreen'
import { LevelSelectScreen } from './components/ui/LevelSelectScreen'
import { LoginGateScreen } from './components/ui/LoginGateScreen'
import { SaveManager } from './game/SaveManager'
import { CloudSaveManager } from './services/CloudSaveManager'
import { resolveClassId } from './config/classes'
import type { ClassId } from './config/classes'
import type { ParagonProfile } from './config/paragon'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import './styles/pixel-ui.css'

import Peer from 'peerjs'

export interface NetworkConfig {
  role: 'host' | 'client';
  roomCode: string;
  peer: Peer;
  nickname: string;
  hostPeerId?: string; // Påkrevd for klienter
  gameMode?: 'pve' | 'pvp' | 'pvp2v2';
  pvpBestOf?: 3 | 5 | 7 | 10;
  pvpOpponentName?: string;
  pvp2v2TeamAssignments?: Record<string, 'A' | 'B'>;
  pvp2v2MySlot?: 'A1' | 'A2' | 'B1' | 'B2';
}

type AppScreen = 'landing' | 'login-gate' | 'character-select' | 'class-select' | 'level-select' | 'game' | 'pvp-lobby';

/** Inner component with access to AuthContext */
function AppContent() {
  const { user } = useAuth();
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [versionMismatch, setVersionMismatch] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration;
      if (registration) {
        // Poll for new SW every 60 minutes (long game sessions)
        setInterval(() => { registration.update(); }, 5 * 60 * 1000);
      }
    },
  });
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [showDemo, setShowDemo] = useState(false);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig | null>(null);
  const [continueRun, setContinueRun] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassId>('krieger');
  const [sessionKey, setSessionKey] = useState(0);
  const [activeProfile, setActiveProfile] = useState<ParagonProfile | null>(null);
  const [targetLevel, setTargetLevel] = useState<number | null>(null);

  // ─── Legacy compat: check for old ClassSelector flow ─────────────────
  const [showClassSelector, setShowClassSelector] = useState(false);

  const handleStartMP = (role: 'host' | 'client', roomCode: string, peer: Peer, nickname: string, hostPeerId?: string) => {
    setNetworkConfig({ role, roomCode, peer, nickname, hostPeerId });
    // Multiplayer hopper over class selector – bruker lastSelectedClass eller default
    const lastClass = resolveClassId(SaveManager.load().lastSelectedClass);
    setSelectedClass(lastClass);
    setScreen('game');
    setSessionKey(prev => prev + 1);
  };

  const handleStartPVP = (
    role: 'host' | 'client',
    peer: Peer,
    nickname: string,
    hostPeerId: string,
    bestOf: 3 | 5 | 7 | 10,
    opponentName: string,
    classId: ClassId
  ) => {
    setNetworkConfig({
      role,
      roomCode: 'pvp',
      peer,
      nickname,
      hostPeerId: role === 'client' ? hostPeerId : undefined,
      gameMode: 'pvp',
      pvpBestOf: bestOf,
      pvpOpponentName: opponentName,
    });
    setSelectedClass(classId);
    setScreen('game');
    setSessionKey(prev => prev + 1);
  };

  const handleStartPVP2v2 = (
    role: 'host' | 'client',
    peer: Peer,
    nickname: string,
    hostPeerId: string,
    bestOf: 3 | 5 | 7 | 10,
    classId: ClassId,
    teamAssignments: Record<string, 'A' | 'B'>,
    mySlot: 'A1' | 'A2' | 'B1' | 'B2'
  ) => {
    setNetworkConfig({
      role,
      roomCode: 'pvp2v2',
      peer,
      nickname,
      hostPeerId: role === 'client' ? hostPeerId : undefined,
      gameMode: 'pvp2v2',
      pvpBestOf: bestOf,
      pvp2v2TeamAssignments: teamAssignments,
      pvp2v2MySlot: mySlot,
    });
    setSelectedClass(classId);
    setScreen('game');
    setSessionKey(prev => prev + 1);
  };

  // ─── New Flow: Character Select Screen ───────────────────────────────

  /** "Spill" button → show login gate or character select */
  const handlePlay = useCallback(() => {
    // One-time migration from legacy save system
    if (!SaveManager.hasProfiles()) {
      const migrated = SaveManager.migrateFromLegacy();
      if (migrated) {
        const store = SaveManager.loadProfiles();
        store.profiles.push(migrated);
        store.activeProfileId = migrated.id;
        SaveManager.saveProfiles(store);
      }
    }

    // Check if user has opted to skip login gate
    const skipLoginGate = localStorage.getItem('kringsringen_skip_login_gate') === 'true';
    if (skipLoginGate || user) {
      // User already logged in or opted out → go straight to character select
      setScreen('character-select');
    } else {
      // Show login gate
      setScreen('login-gate');
    }
  }, [user]);

  /** Player selected an existing character → show level select */
  const handleSelectProfile = useCallback((profile: ParagonProfile) => {
    SaveManager.setActiveProfile(profile.id);
    setActiveProfile(profile);
    setSelectedClass(profile.classId);
    setContinueRun(true);

    // Also write RunProgress for compatibility with existing game code
    const runProgress = SaveManager.profileToRunProgress(profile);
    SaveManager.saveRunProgress(runProgress);

    setScreen('level-select');
  }, []);

  /** Player clicked "New Character" → show class selector for new character */
  const handleNewCharacter = useCallback(() => {
    setScreen('class-select');
  }, []);

  /** Player completes login/sync on LoginGateScreen */
  const handleLoginComplete = useCallback(() => {
    setScreen('character-select');
  }, []);

  /** Player clicks "Continue without login" on LoginGateScreen */
  const handleSkipLogin = useCallback(() => {
    setScreen('character-select');
  }, []);

  /** Player chose a class for new character → create profile and go to game */
  const handleClassSelected = useCallback((classId: ClassId, characterName: string) => {
    const profile = SaveManager.createProfile(characterName, classId);

    setActiveProfile(profile);
    setSelectedClass(classId);
    setContinueRun(false);
    setTargetLevel(null);
    SaveManager.save({ lastSelectedClass: classId });

    // Write RunProgress for compatibility
    const runProgress = SaveManager.profileToRunProgress(profile);
    SaveManager.saveRunProgress(runProgress);

    setScreen('game');
    setSessionKey(prev => prev + 1);
  }, []);

  /** Player selected a level from level select */
  const handleSelectLevel = useCallback((level: number) => {
    if (!activeProfile) return;

    setTargetLevel(level);
    setContinueRun(true);

    // Update RunProgress to target the selected level
    const runProgress = SaveManager.profileToRunProgress(activeProfile);
    runProgress.gameLevel = level;
    runProgress.currentWave = 1;
    // Clear saved enemies when starting a fresh level
    runProgress.savedEnemies = undefined;
    runProgress.waveEnemiesRemaining = undefined;
    SaveManager.saveRunProgress(runProgress);

    setScreen('game');
    setSessionKey(prev => prev + 1);
  }, [activeProfile]);

  /** Legacy: "Nytt spill" uten profil-system (fallback / legacy) */
  const handleStartNew = useCallback(() => {
    SaveManager.clearRunProgress();
    const lastClass = resolveClassId(SaveManager.load().lastSelectedClass);
    setSelectedClass(lastClass);
    setContinueRun(false);
    setNetworkConfig(null);
    setShowClassSelector(true);
  }, []);

  /** Legacy: "Fortsett spill" uten profil-system */
  const handleContinue = useCallback(() => {
    const runProgress = SaveManager.loadRunProgress();
    const classId = resolveClassId(runProgress?.playerClass);
    setSelectedClass(classId);
    setContinueRun(true);
    setNetworkConfig(null);
    setScreen('game');
    setSessionKey(prev => prev + 1);
  }, []);

  const handleExitToMenu = useCallback(() => {
    // Sync active profile before returning to menu
    if (activeProfile) {
      const runProgress = SaveManager.loadRunProgress();
      if (runProgress) {
        // Read fresh from localStorage to capture achievements written by AchievementManager during gameplay
        const currentProfile = SaveManager.getActiveProfile() ?? activeProfile;
        const updated = SaveManager.syncToProfile(currentProfile, runProgress);
        SaveManager.updateProfile(updated);
        setActiveProfile(updated);
      }
    }

    setContinueRun(false);
    setNetworkConfig(null);
    setTargetLevel(null);
    setScreen('landing');
  }, [activeProfile]);

  // Version check — extracted so it can be reused from multiple call sites
  const checkVersion = useCallback(async () => {
    if (import.meta.env.DEV) return;
    try {
      const res = await fetch('/version.json', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as { buildTime: number };
      if (data.buildTime !== __APP_BUILD_TIME__) {
        setVersionMismatch(true);
        registrationRef.current?.update();
      }
    } catch { /* Network error — silently ignore */ }
  }, []);

  // Run version check on mount
  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  // Auto-activate the waiting SW immediately when on the landing screen (safe to reload here).
  // With registerType:'prompt', the new SW sits in "waiting" forever unless skipWaiting() is
  // called. Ctrl+Refresh does NOT bypass the SW. This effect guarantees activation without
  // requiring any user interaction.
  useEffect(() => {
    if (needRefresh && screen === 'landing') {
      updateServiceWorker(true);
    }
  }, [needRefresh, screen, updateServiceWorker]);

  // Force sync on app blur/visibility change (before device switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && user && activeProfile) {
        // Sync current game progress to profile
        const runProgress = SaveManager.loadRunProgress();
        if (runProgress) {
          // Read fresh from localStorage to capture achievements written by AchievementManager during gameplay
          const currentProfile = SaveManager.getActiveProfile() ?? activeProfile;
          const updated = SaveManager.syncToProfile(currentProfile, runProgress);
          SaveManager.updateProfile(updated);
          setActiveProfile(updated);

          // Upload to cloud immediately (no debounce)
          const store = SaveManager.loadProfiles();
          CloudSaveManager.uploadProfiles(user.uid, store.profiles).catch(err => {
            console.warn('[App] Blur sync failed:', err);
          });
        }
      } else {
        // Tab became visible — trigger SW update check and re-run version compare
        registrationRef.current?.update();
        checkVersion();
      }
    };

    const handleBeforeUnload = () => {
      if (user && activeProfile) {
        const runProgress = SaveManager.loadRunProgress();
        if (runProgress) {
          const currentProfile = SaveManager.getActiveProfile() ?? activeProfile;
          const updated = SaveManager.syncToProfile(currentProfile, runProgress);
          SaveManager.updateProfile(updated);
          // Note: Can't do async upload here (browser blocks it)
          // Rely on visibility change for cloud sync
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, activeProfile, checkVersion]);

  // ─── Screen Rendering ────────────────────────────────────────────────

  return (
    <>
      {screen === 'landing' && (
        <>
          <LandingPage
            onStart={handleStartNew}
            onContinue={handleContinue}
            onStartMP={handleStartMP}
            onPlay={handlePlay}
            onPvp={() => setScreen('pvp-lobby')}
            needRefresh={needRefresh || versionMismatch}
            onUpdate={() => updateServiceWorker(true)}
          />
          {showClassSelector && (
            <ClassSelector
              onSelect={(classId, _characterName) => {
                setSelectedClass(classId);
                SaveManager.save({ lastSelectedClass: classId });
                setShowClassSelector(false);
                setScreen('game');
                setSessionKey(prev => prev + 1);
              }}
              onClose={() => setShowClassSelector(false)}
              defaultClass={selectedClass}
            />
          )}
        </>
      )}

      {screen === 'login-gate' && (
        <LoginGateScreen
          onContinue={handleSkipLogin}
          onLoginComplete={handleLoginComplete}
        />
      )}

      {screen === 'character-select' && (
        <CharacterSelectScreen
          onSelectProfile={handleSelectProfile}
          onNewCharacter={handleNewCharacter}
          onClose={() => setScreen('landing')}
        />
      )}

      {screen === 'class-select' && (
        <ClassSelector
          onSelect={handleClassSelected}
          onClose={() => setScreen('character-select')}
          defaultClass={selectedClass}
        />
      )}

      {screen === 'level-select' && activeProfile && (
        <LevelSelectScreen
          profile={activeProfile}
          onSelectLevel={handleSelectLevel}
          onClose={() => setScreen('character-select')}
        />
      )}

      {screen === 'pvp-lobby' && (
        <PvpLobby
          isOpen={true}
          onClose={() => setScreen('landing')}
          onStartPvp={handleStartPVP}
          onStartPvp2v2={handleStartPVP2v2}
        />
      )}

      {screen === 'game' && (
        <div className="w-full h-screen bg-black relative">
          {/* Toggle Button */}
          <div className="absolute bottom-4 right-4 z-50">
            <FantasyButton
              onClick={() => setShowDemo(!showDemo)}
              label={showDemo ? "Back to Game" : "UI Demo"}
              className="text-xs px-4 py-1"
            />
          </div>

          {showDemo ? (
            window.location.hash === '#debug' ? <FantasyDebug /> : <FantasyDemo />
          ) : (
            <GameContainer
              key={sessionKey}
              networkConfig={networkConfig}
              continueRun={continueRun}
              selectedClass={selectedClass}
              onExitToMenu={handleExitToMenu}
              activeProfile={activeProfile}
              targetLevel={targetLevel}
            />
          )}
        </div>
      )}
    </>
  );
}

/** Main App wrapper with AuthProvider */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
// HMR Trigger
