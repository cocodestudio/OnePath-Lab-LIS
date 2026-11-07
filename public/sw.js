// OnePath Lab LIS — Desktop & Mobile PWA Service Worker
const CACHE_NAME = 'onepath-lims-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Completely pass through localhost, navigations, auth, and login routes to avoid net::ERR_FAILED
  const url = new URL(event.request.url);
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    event.request.mode === 'navigate' ||
    event.request.method !== 'GET' ||
    url.pathname.includes('/login') ||
    url.pathname.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    })
  );
});
