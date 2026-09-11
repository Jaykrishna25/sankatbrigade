/*
 * SankatBrigade service worker.
 *
 * Honest scope: this caches the application shell (HTML, JS, CSS, icons) so the
 * prototype opens and the locally stored incidents stay readable without a
 * network connection. It does NOT provide real emergency coordination offline
 * and it never contacts any emergency service.
 *
 * Strategy:
 *   - install : pre-cache the small, known shell files
 *   - navigate: network-first, fall back to the cached shell (offline)
 *   - assets  : stale-while-revalidate for same-origin GET requests
 */

const CACHE_VERSION = 'sankatbrigade-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Paths are relative to the service worker scope, so the same file works when
// the site is hosted at a domain root (Cloudflare Pages) or in a sub-folder
// (GitHub Pages project sites).
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.all(
          SHELL_ASSETS.map((asset) =>
            cache.add(new Request(asset, { cache: 'reload' })).catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: try the network first so a deployed update is picked up,
  // then fall back to the cached shell when the device is offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() =>
          caches
            .match('./index.html')
            .then((cached) => cached || caches.match('./') )
            .then(
              (cached) =>
                cached ||
                new Response(
                  '<!doctype html><meta charset="utf-8"><title>SankatBrigade offline</title>' +
                    '<body style="font-family:system-ui;background:#0b1120;color:#e8eefc;padding:24px">' +
                    '<h1>SankatBrigade is offline</h1>' +
                    '<p>Limited prototype access is available offline. Real-time coordination requires connectivity.</p>' +
                    '<p><strong>For immediate life-threatening danger, contact local emergency services now. ' +
                    'Do not wait for SankatBrigade.</strong></p></body>',
                  { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
                ),
            ),
        ),
    );
    return;
  }

  // Static assets: serve from cache immediately, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
