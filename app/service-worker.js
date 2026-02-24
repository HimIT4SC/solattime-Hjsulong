const VERSION = 'v1.0.6';                    // ← bump this to clear all caches
const CACHE_NAME = `taqweem-${VERSION}`;

// Pre-cache only LOCAL assets to avoid CORS issues during installation
const ASSETS = [
    './index.html',
    './taqweem.png',
    './patani_prayer_times.json',
    './manifest.json'
];

/* ── Install: cache local assets ───────────────────── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Pre-caching local assets...');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('❌ Prefetch failed:', err))
    );
});

/* ── Activate: delete old caches + broadcast version ─ */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => {
            return self.clients.claim().then(() => {
                return self.clients.matchAll({ type: 'window' }).then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'VERSION', value: VERSION });
                    });
                });
            });
        })
    );
});

/* ── Fetch: network-first, fallback to cache ───────── */
self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Skip external extensions/browser stuff
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // If valid response, clone and store in cache
                if (response && response.status === 200 && response.type === 'basic' || response.type === 'cors') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                // Return from cache if network fails
                return caches.match(event.request);
            })
    );
});

/* ── Communication: handle messages from main page ── */
self.addEventListener('message', event => {
    if (event.data === 'GET_VERSION') {
        if (event.source) {
            event.source.postMessage({ type: 'VERSION', value: VERSION });
        }
    }
});
