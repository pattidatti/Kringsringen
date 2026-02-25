
import { useState } from 'react'
import { GameContainer } from './components/GameContainer'
import LandingPage from './components/LandingPage'
import FantasyDemo from './components/ui/FantasyDemo'
import { FantasyButton } from './components/ui/FantasyButton'
import { FantasyDebug } from './components/dev/FantasyDebug'
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
  const [showDemo, setShowDemo] = useState(false);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig | null>(null);

  const handleStartMP = (role: 'host' | 'client', roomCode: string, peer: Peer, nickname: string, hostPeerId?: string) => {
    setNetworkConfig({ role, roomCode, peer, nickname, hostPeerId });
    setShowLanding(false);
  };

  if (showLanding) {
    return (
      <LandingPage
        onStart={() => {
          setNetworkConfig(null);
          setShowLanding(false);
        }}
        onStartMP={handleStartMP}
      />
    );
  }

  return (
    <div className="w-full h-screen bg-slate-950 relative">
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
      ) : <GameContainer networkConfig={networkConfig} />}
    </div>
  )
}

export default App
// HMR Trigger
