/* Service worker: caches every asset on first load so the app works fully offline.
   Bump VERSION whenever any file changes so clients pick up the new files. */
const VERSION = 'nail-viz-v3';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './hand-photo.js', './catalog.json', './catalog-fallback.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// cache-first (everything is static); navigations fall back to the cached index.html
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // the shade catalog is network-first (fresh when online, cached copy offline)
  if (new URL(e.request.url).pathname.endsWith('/catalog.json')) {
    e.respondWith(fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./catalog.json', copy)); }
      return res;
    }).catch(() => caches.match('./catalog.json')));
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
