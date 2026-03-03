
import { useState } from 'react'
import { GameContainer } from './components/GameContainer'
import LandingPage from './components/LandingPage'
import FantasyDemo from './components/ui/FantasyDemo'
import { FantasyButton } from './components/ui/FantasyButton'
import { FantasyDebug } from './components/dev/FantasyDebug'
import { ClassSelector } from './components/ui/ClassSelector'
import { SaveManager } from './game/SaveManager'
import { resolveClassId } from './config/classes'
import type { ClassId } from './config/classes'
import './index.css'
import './styles/pixel-ui.css'

import Peer from 'peerjs'

export interface NetworkConfig {
  role: 'host' | 'client';
  roomCode: string;
  peer: Peer;
  nickname: string;
  hostPeerId?: string; // Påkrevd for klienter
}

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig | null>(null);
  const [continueRun, setContinueRun] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassId>('krieger');
  const [sessionKey, setSessionKey] = useState(0);

  const handleStartMP = (role: 'host' | 'client', roomCode: string, peer: Peer, nickname: string, hostPeerId?: string) => {
    setNetworkConfig({ role, roomCode, peer, nickname, hostPeerId });
    // Multiplayer hopper over class selector – bruker lastSelectedClass eller default
    const lastClass = resolveClassId(SaveManager.load().lastSelectedClass);
    setSelectedClass(lastClass);
    setShowLanding(false);
    setSessionKey(prev => prev + 1);
  };

  /** Nytt spill: vis ClassSelector først */
  const handleStartNew = () => {
    SaveManager.clearRunProgress();
    const lastClass = resolveClassId(SaveManager.load().lastSelectedClass);
    setSelectedClass(lastClass);
    setContinueRun(false);
    setNetworkConfig(null);
    setShowClassSelector(true);
  };

  /** Spilleren valgte klasse i ClassSelector */
  const handleClassSelected = (classId: ClassId) => {
    setSelectedClass(classId);
    SaveManager.save({ lastSelectedClass: classId });
    setShowClassSelector(false);
    setShowLanding(false);
    setSessionKey(prev => prev + 1);
  };

  /** Fortsett spill: hent klasse fra lagret progress, hopp over selector */
  const handleContinue = () => {
    const runProgress = SaveManager.loadRunProgress();
    const classId = resolveClassId(runProgress?.playerClass);
    setSelectedClass(classId);
    setContinueRun(true);
    setNetworkConfig(null);
    setShowLanding(false);
    setSessionKey(prev => prev + 1);
  };

  const handleExitToMenu = () => {
    setContinueRun(false);
    setNetworkConfig(null);
    setShowLanding(true);
  };

  if (showLanding) {
    return (
      <>
        <LandingPage
          onStart={handleStartNew}
          onContinue={handleContinue}
          onStartMP={handleStartMP}
        />
        {showClassSelector && (
          <ClassSelector
            onSelect={handleClassSelected}
            onClose={() => setShowClassSelector(false)}
            defaultClass={selectedClass}
          />
        )}
      </>
    );
  }

  return (
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
      ) : <GameContainer key={sessionKey} networkConfig={networkConfig} continueRun={continueRun} selectedClass={selectedClass} onExitToMenu={handleExitToMenu} />}
    </div>
  );
}

export default App
// HMR Trigger
