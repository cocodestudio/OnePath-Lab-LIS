// OnePath Lab LIS — Desktop & Mobile PWA Service Worker
const CACHE_NAME = 'onepath-lims-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through strategy for modern dynamic Next.js routes and backend APIs
  if (event.request.method !== 'GET') return;

  // Let browser handle page navigations natively without service worker interception to prevent ERR_FAILED
  if (event.request.mode === 'navigate') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('', { status: 408, statusText: 'Request Timeout or Offline' });
    })
  );
});

