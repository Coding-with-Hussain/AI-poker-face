import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installNetworkGuard } from './privacy/networkGuard';
import App from './App';
import './styles/tokens.css';
import './styles/components.css';
import './styles/home.css';
import './styles/setup.css';
import './styles/game.css';
import './styles/gags.css';
import './styles/results.css';

// Before anything can load MediaPipe: refuse all outbound (cross-origin) fetches.
installNetworkGuard();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
