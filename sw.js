const CACHE_NAME = 'ddp-global-v1';
const ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Barlow:wght@400;600;700;800&display=swap'
];

// Install — cachear assets principales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // Si falla algún asset, continuar igual
      });
    })
  );
  self.skipWaiting();
});

// Activate — limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', event => {
  // No interceptar llamadas a la API de Anthropic/Cloudflare
  if (event.request.url.includes('anthropic.com') ||
      event.request.url.includes('workers.dev') ||
      event.request.url.includes('googleapis.com/css')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar en cache si es una respuesta válida
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sin red — servir desde cache
        return caches.match(event.request).then(cached => {
          return cached || caches.match('/index.html');
        });
      })
  );
});
