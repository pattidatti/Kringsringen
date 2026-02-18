
import { useState } from 'react'
import { GameContainer } from './components/GameContainer'
import FantasyDemo from './components/ui/FantasyDemo'
import { FantasyButton } from './components/ui/FantasyButton'
import './index.css'
import './styles/pixel-ui.css'

function App() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="w-full h-screen bg-slate-950 relative">
      {/* Toggle Button */}
      <div className="absolute top-4 right-4 z-50">
        <FantasyButton
          onClick={() => setShowDemo(!showDemo)}
          label={showDemo ? "Back to Game" : "UI Demo"}
          className="text-xs px-4 py-1"
        />
      </div>

      {showDemo ? <FantasyDemo /> : <GameContainer />}
    </div>
  )
}

export default App
