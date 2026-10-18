/**
 * sw.js — offline service worker for CleanCase Converter (PWA).
 * Static files only: cache-first for same-origin, runtime cache for
 * Google Fonts, index.html fallback for navigations when offline.
 */
const CACHE = 'cleancase-v2';
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'converter.js',
  'script.js',
  'cleaner.js',
  'cleaner-ui.js',
  'case-converter.js',
  'views.js',
  'logo.png',
  'icon-192.png',
  'icon-512.png',
  'Bangla.ttf',
  'SutonnyMJ.ttf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cachePut(request, response) {
  const copy = response.clone();
  caches.open(CACHE).then((c) => c.put(request, copy));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Same-origin: cache-first, fall back to network, then index.html.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cachePut(req, res);
          return res;
        }).catch(() => {
          if (req.mode === 'navigate') return caches.match('index.html');
          return caches.match(req);
        });
      })
    );
    return;
  }

  // Google Fonts (css + files): runtime cache so the app works
  // fully offline after the first online load.
  if (url.hostname.indexOf('fonts.g') !== -1) {
    event.respondWith(
      caches.match(req).then((hit) => {
        return fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cachePut(req, res);
          return res;
        }).catch(() => hit || Response.error());
      })
    );
  }
});
