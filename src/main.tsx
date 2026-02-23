import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/pixel-ui.css'
import App from './App.tsx'

document.documentElement.style.setProperty(
    '--ui-sprite',
    `url(${import.meta.env.BASE_URL}assets/sprites/ui/MediavelFree.png)`
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
