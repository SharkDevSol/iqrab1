// Service worker - network first, no caching
const CACHE_NAME = 'skoolific-v3';

// On install - clear all old caches
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
  );
});

// On activate - claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Always fetch from network - no cache
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
