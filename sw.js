// ==========================================
// KRT TRADERS ERP - SERVICE WORKER
// Developed by Bilal Suleman
// ==========================================

const CACHE_NAME = 'krt-erp-v5.0';
const ASSETS = [
    '/', '/index.html', '/style.css', '/script.js',
    '/manifest.json', '/logo.png', '/offline.html'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    if (url.hostname.includes('supabase.co') || e.request.method !== 'GET') return;
    
    e.respondWith(
        fetch(e.request)
            .then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return res;
            })
            .catch(() => caches.match(e.request)
                .then(cached => cached || caches.match('/offline.html'))
            )
    );
});
