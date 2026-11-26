const CACHE_NAME = 'game-mania-v1';
const ASSETS = ['/', '/console', '/play', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/') || event.request.url.includes('socket.io')) return;
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
