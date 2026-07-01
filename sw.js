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
            .then(cache => {
                console.log('[SW] Caching assets...');
                return cache.addAll(ASSETS);
            })
            .then(() => {
                console.log('[SW] Assets cached successfully');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[SW] Cache installation failed:', err);
            })
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => {
                    console.log('[SW] Deleting old cache:', k);
                    return caches.delete(k);
                })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    
    // Skip Supabase API calls and non-GET requests
    if (url.hostname.includes('supabase.co') || e.request.method !== 'GET') {
        return;
    }
    
    // Skip if request is for analytics or tracking
    if (url.hostname.includes('google') || url.hostname.includes('analytics')) {
        return;
    }
    
    e.respondWith(
        fetch(e.request)
            .then(res => {
                // Only cache successful responses
                if (res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        try {
                            cache.put(e.request, clone);
                        } catch (err) {
                            console.warn('[SW] Cache put failed:', err);
                        }
                    });
                }
                return res;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(e.request)
                    .then(cached => {
                        if (cached) {
                            console.log('[SW] Serving from cache:', e.request.url);
                            return cached;
                        }
                        // If not in cache, serve offline page
                        return caches.match('/offline.html')
                            .then(offline => offline || new Response('Offline', { status: 503 }));
                    });
            })
    );
});
