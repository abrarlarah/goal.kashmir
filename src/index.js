import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Capture the install prompt EARLY before React mounts
// This ensures we never miss the beforeinstallprompt event
window.__PWA_DEFERRED_PROMPT = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__PWA_DEFERRED_PROMPT = e;
  // Dispatch a custom event so React components can react to it
  window.dispatchEvent(new Event('pwa-install-available'));
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);

// Register the service worker for PWA support
serviceWorkerRegistration.register();