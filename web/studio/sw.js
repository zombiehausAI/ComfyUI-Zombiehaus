// Zombiehaus Studio PWA Service Worker
const CACHE_NAME = 'zombiehaus-studio-v1';
const STATIC_ASSETS = [
    '/zombiehaus/studio',
    '/extensions/ComfyUI-Zombiehaus/studio/studio.css',
    '/extensions/ComfyUI-Zombiehaus/studio/studio.js',
    '/extensions/ComfyUI-Zombiehaus/studio/manifest.json',
    '/extensions/ComfyUI-Zombiehaus/studio/icons/icon-192.png',
    '/extensions/ComfyUI-Zombiehaus/studio/icons/icon-512.png',
    '/extensions/ComfyUI-Zombiehaus/studio/icons/favicon.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[Zombiehaus SW] Pre-cache non-fatal error:', err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only intercept GET requests for studio assets; pass API requests directly to network
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/prompt') || url.pathname.startsWith('/ws') || url.pathname.startsWith('/zombiehaus/enhance')) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
