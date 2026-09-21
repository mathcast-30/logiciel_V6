
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/themes.css'
import App from './App'

// ──────────────────────────────────────────────────────────────────────────────
// Extinction automatique du serveur backend à la fermeture de la fenêtre / l'onglet.
//
// • Utilise navigator.sendBeacon('/api/shutdown-intent') sur pagehide.
// • Délai de confirmation de 1.5s côté backend pour distinguer une fermeture réelle
//   d'un simple rechargement (F5).
// • Si rechargement, le heartbeat émis au montage annule l'intention d'arrêt.
// ──────────────────────────────────────────────────────────────────────────────
const SHUTDOWN_INTENT_URL = window.location.port === '5173'
  ? 'http://localhost:8000/api/shutdown-intent'
  : '/api/shutdown-intent';

window.addEventListener('pagehide', () => {
  if (navigator.sendBeacon) {
    navigator.sendBeacon(SHUTDOWN_INTENT_URL);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
