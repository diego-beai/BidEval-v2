const CACHE_NAME = 'rfq-processor-v1';
const STATIC_CACHE = 'rfq-static-v1';
const DYNAMIC_CACHE = 'rfq-dynamic-v1';

// Recursos críticos para cachear inmediatamente
const CRITICAL_RESOURCES = [
  '/',
  '/favicon.png',
  '/manifest.json'
];

// Recursos estáticos para cachear
const STATIC_RESOURCES = [
  '/assets/index-*.css',
  '/assets/index-*.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache recursos críticos
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(CRITICAL_RESOURCES.concat(STATIC_RESOURCES));
      })
    ]).then(() => {
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control inmediatamente
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Solo cachear requests GET del mismo origen
  if (event.request.method !== 'GET' ||
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Estrategia Cache First para recursos estáticos
  if (event.request.url.includes('/assets/') ||
      event.request.url.includes('.css') ||
      event.request.url.includes('.js')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(fetchResponse => {
          return caches.open(STATIC_CACHE).then(cache => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Estrategia Network First para la aplicación principal
  event.respondWith(
    fetch(event.request)
      .then(fetchResponse => {
        // Cachear respuesta exitosa
        if (fetchResponse.status === 200) {
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, fetchResponse.clone());
          });
        }
        return fetchResponse;
      })
      .catch(() => {
        // Fallback a cache si network falla
        return caches.match(event.request);
      })
  );
});
