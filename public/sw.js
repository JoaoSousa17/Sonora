/**
 * Sonora Service Worker
 * Cache apenas de assets estáticos locais; ignora requisições de áudio e APIs externas
 */

const CACHE_NAME = 'sonora-static-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar completamente chamadas de áudio, APIs externas e proxies de streaming
  if (
    url.hostname !== self.location.hostname ||
    event.request.destination === 'audio' ||
    url.pathname.includes('/api/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Deixa o browser tratar nativamente
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
