// Stargazer Service Worker
// Caches Sky Lab for offline use, network-first for main app

const CACHE_NAME = 'stargazer-v1';
const SKYLAB_CACHE = 'skylab-v1';

// Sky Lab assets to precache (core functionality)
const SKYLAB_CORE = [
  '/sky-lab/',
  '/sky-lab/index.html',
  '/sky-lab/static/js/app.14b094410fbcd537a6ca.js',
  '/sky-lab/static/js/vendor.a46a2ffdde3ffbf8a523.js',
  '/sky-lab/static/js/manifest.c7a1f17f07cae11d7ca9.js',
  '/sky-lab/static/js/stellarium-web-engine.js',
  '/sky-lab/static/js/stellarium-web-engine.wasm',
  '/sky-lab/static/css/app.2cc6d43db3447e7c38ea7dfe7006ca91.css',
  '/sky-lab/static/favicon.ico',
];

// Install: precache Sky Lab core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(SKYLAB_CACHE).then((cache) => {
      console.log('[SW] Precaching Sky Lab assets');
      return cache.addAll(SKYLAB_CORE);
    }).then(() => {
      console.log('[SW] Sky Lab assets cached');
      return self.skipWaiting();
    }).catch((err) => {
      console.error('[SW] Failed to cache Sky Lab:', err);
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== SKYLAB_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: different strategies based on request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Sky Lab assets: cache-first (works offline)
  if (url.pathname.startsWith('/sky-lab/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          // Return cached, but also update cache in background
          fetch(event.request).then((response) => {
            if (response.ok) {
              caches.open(SKYLAB_CACHE).then((cache) => {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {});
          return cached;
        }
        // Not cached, fetch and cache
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(SKYLAB_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // API calls: network-only (need fresh data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Main app: network-first with offline fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful HTML responses
        if (response.ok && event.request.mode === 'navigate') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: try cache, then fallback
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // If navigating and offline, show offline page or cached home
          if (event.request.mode === 'navigate') {
            return caches.match('/').then((home) => {
              if (home) return home;
              return new Response(
                '<html><body style="background:#0f0f1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui"><div style="text-align:center"><h1>Offline</h1><p>Sky Lab is available offline!</p><a href="/sky-lab/" style="color:#6366f1">Open Sky Lab</a></div></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
