import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/animations.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root was not found in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/*
 * Register the service worker so SankatBrigade is installable and the shell
 * opens offline. The relative URL keeps this working on Cloudflare Pages (site
 * root) and on GitHub Pages project sites (/<repo>/) with no config change.
 * Registration failures are non-fatal: the app runs exactly the same without it.
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', new URL(import.meta.env.BASE_URL, window.location.href)).href;
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* offline support is unavailable in this context - not an error for the user */
    });
  });
}
