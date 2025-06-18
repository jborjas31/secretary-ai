const CACHE_NAME = 'secretary-ai-v13'; // Optimized task migration logic
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './css/task-management.css',
    './js/app.js',
    './js/config.js',
    './js/validation-utils.js',
    './js/event-manager.js',
    './js/ui-components.js',
    './js/storage.js',
    './js/firestore.js',
    './js/task-data-service.js',
    './js/schedule-data-service.js',
    './js/task-parser.js',
    './js/llm-service.js',
    './tasks.md'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker: Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
                    cache: 'reload'
                })));
            })
            .then(() => self.skipWaiting())
            .catch(err => console.log('Service Worker: Cache failed', err))
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activate');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cache => {
                        if (cache !== CACHE_NAME) {
                            console.log('Service Worker: Clearing old cache', cache);
                            return caches.delete(cache);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip cross-origin requests and non-GET requests
    if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
        return;
    }

    // Special handling for API requests
    if (event.request.url.includes('openrouter.ai') || 
        event.request.url.includes('firestore.googleapis.com')) {
        // Network first for API calls
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // If API fails, return a custom offline response
                    return new Response(JSON.stringify({
                        error: 'offline',
                        message: 'No internet connection. Using cached data.'
                    }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // Special handling for tasks.md - network first with cache fallback
    if (event.request.url.endsWith('tasks.md')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // If successful, cache the new version
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseClone);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache first strategy for static assets
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request)
                    .then(fetchResponse => {
                        // Cache successful responses
                        if (fetchResponse.status === 200) {
                            const responseClone = fetchResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return fetchResponse;
                    });
            })
            .catch(() => {
                // Return offline page or basic response for HTML requests
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
                return new Response('Offline - content not available', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                });
            })
    );
});

// Background sync for when connection is restored
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'sync-tasks') {
        event.waitUntil(
            // Trigger sync when back online
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SYNC_TASKS' });
                });
            })
        );
    }
});

// Listen for messages from the main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
            case 'GET_VERSION':
                event.ports[0].postMessage({ version: CACHE_NAME });
                break;
        }
    }
});