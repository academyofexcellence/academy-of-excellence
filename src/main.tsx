import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 🚀 Automatic Cache Buster & Version Synchronization Engine
const CURRENT_APP_VERSION = '2026.08.05.v2';
const storedVersion = localStorage.getItem('aoe_app_version');

if (storedVersion !== CURRENT_APP_VERSION) {
  localStorage.setItem('aoe_app_version', CURRENT_APP_VERSION);
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register PWA Service Worker with auto-update listener
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered successfully:', reg.scope);
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New application version available. Auto-reloading for fresh assets...');
                window.location.reload();
              }
            };
          }
        };
      })
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}

// Listen for PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
  window.dispatchEvent(new Event('pwa-prompt-available'));
});
