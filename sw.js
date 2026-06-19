// ==========================================
// KRT TRADERS ERP - SERVICE WORKER
// Developed by Bilal Suleman
// ==========================================

const CACHE_NAME = 'krt-erp-v5.0';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/logo.png',
    '/google545d4bbd12933656.html'
];

// ==========================================
// INSTALL EVENT - Cache Assets
// ==========================================
self.addEventListener('install', function(event) {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('[Service Worker] Caching assets...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(function() {
                console.log('[Service Worker] Installation complete!');
                return self.skipWaiting();
            })
            .catch(function(error) {
                console.error('[Service Worker] Cache failed:', error);
            })
    );
});

// ==========================================
// ACTIVATE EVENT - Clean Old Caches
// ==========================================
self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(function(cacheNames) {
                return Promise.all(
                    cacheNames.map(function(cacheName) {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(function() {
                console.log('[Service Worker] Activation complete!');
                return self.clients.claim();
            })
    );
});

// ==========================================
// FETCH EVENT - Network First Strategy with Cache Fallback
// ==========================================
self.addEventListener('fetch', function(event) {
    const requestUrl = new URL(event.request.url);
    
    // Skip cross-origin requests
    if (!requestUrl.origin.startsWith(self.location.origin)) {
        return;
    }
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip Supabase API calls
    if (requestUrl.hostname.includes('supabase.co')) {
        return;
    }
    
    // Network First Strategy
    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                // Clone response for caching
                const responseClone = response.clone();
                
                caches.open(CACHE_NAME)
                    .then(function(cache) {
                        cache.put(event.request, responseClone);
                    })
                    .catch(function(error) {
                        console.warn('[Service Worker] Cache put failed:', error);
                    });
                
                return response;
            })
            .catch(function() {
                // If network fails, try cache
                return caches.match(event.request)
                    .then(function(cachedResponse) {
                        if (cachedResponse) {
                            console.log('[Service Worker] Serving from cache:', event.request.url);
                            return cachedResponse;
                        }
                        
                        // If not in cache, show offline page
                        return caches.match('/offline.html')
                            .then(function(offlineResponse) {
                                if (offlineResponse) {
                                    return offlineResponse;
                                }
                                
                                // Return basic offline response
                                return new Response(
                                    '<h1>⚠️ KRT TRADERS ERP - Offline</h1>' +
                                    '<p>Please check your internet connection.</p>' +
                                    '<p><strong>Developed by Bilal Suleman</strong></p>',
                                    {
                                        headers: {
                                            'Content-Type': 'text/html'
                                        }
                                    }
                                );
                            });
                    });
            })
    );
});

// ==========================================
// MESSAGE EVENT - Handle Client Messages
// ==========================================
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ==========================================
// PUSH NOTIFICATION (Optional)
// ==========================================
self.addEventListener('push', function(event) {
    const options = {
        body: event.data ? event.data.text() : 'KRT ERP Update Available',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('📊 KRT TRADERS ERP', options)
    );
});

// ==========================================
// NOTIFICATION CLICK
// ==========================================
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

// ==========================================
// BACKGROUND SYNC (Optional)
// ==========================================
self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-data') {
        event.waitUntil(
            // Attempt to sync data
            syncPendingData()
        );
    }
});

// ==========================================
// SYNC PENDING DATA FUNCTION
// ==========================================
async function syncPendingData() {
    try {
        const cache = await caches.open('pending-data');
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                    console.log('[Service Worker] Synced:', request.url);
                }
            } catch (error) {
                console.warn('[Service Worker] Sync failed for:', request.url);
            }
        }
    } catch (error) {
        console.error('[Service Worker] Sync error:', error);
    }
}

// ==========================================
// PERIODIC BACKGROUND SYNC (Chrome Only)
// ==========================================
self.addEventListener('periodicsync', function(event) {
    if (event.tag === 'periodic-sync') {
        event.waitUntil(
            syncPendingData()
        );
    }
});

// ==========================================
// OFFLINE ANALYTICS (Simple)
// ==========================================
const offlineLogs = [];

self.addEventListener('fetch', function(event) {
    // Log offline requests for analytics
    if (!navigator.onLine) {
        offlineLogs.push({
            url: event.request.url,
            timestamp: new Date().toISOString()
        });
        
        // Store logs when back online
        if (offlineLogs.length > 100) {
            sendOfflineLogs();
        }
    }
});

async function sendOfflineLogs() {
    if (navigator.onLine && offlineLogs.length > 0) {
        try {
            // Send logs to server (optional)
            console.log('[Service Worker] Sending offline logs:', offlineLogs.length);
            offlineLogs.length = 0; // Clear logs
        } catch (error) {
            console.error('[Service Worker] Failed to send logs:', error);
        }
    }
}

// ==========================================
// VERSION CHECK
// ==========================================
console.log('[Service Worker] KRT ERP v5.0 Loaded');
console.log('[Service Worker] Developed by Bilal Suleman');
