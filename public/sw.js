// Service Worker for Calm Companion Chat App v2.1.0

const CACHE_NAME = 'calm-companion-v2.1.0';
const STATIC_CACHE = 'calm-companion-static-v2.1.0';
const DYNAMIC_CACHE = 'calm-companion-dynamic-v2.1.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/profile.html',
    '/meditation.html',
    '/style.css',
    '/chat.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Error caching static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle static file requests
    if (url.origin === self.location.origin) {
        event.respondWith(handleStaticRequest(request));
        return;
    }

    // Handle external requests (fonts, etc.)
    if (url.origin !== self.location.origin) {
        event.respondWith(handleExternalRequest(request));
        return;
    }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed for API request, trying cache:', request.url);
        
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline response for API requests
        return new Response(
            JSON.stringify({
                error: 'You are offline. Please check your connection and try again.',
                code: 'OFFLINE_ERROR'
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
}

// Handle static file requests with cache-first strategy
async function handleStaticRequest(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fallback to network
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Both cache and network failed for static request:', request.url);
        
        // Return offline page for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
        }
        
        throw error;
    }
}

// Handle external requests (fonts, etc.)
async function handleExternalRequest(request) {
    try {
        // Try network first for external resources
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed for external request, trying cache:', request.url);
        
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('Background sync triggered');
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Get stored offline actions
        const offlineActions = await getOfflineActions();
        
        for (const action of offlineActions) {
            try {
                await processOfflineAction(action);
                await removeOfflineAction(action.id);
            } catch (error) {
                console.error('Failed to process offline action:', error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Store offline actions
async function storeOfflineAction(action) {
    try {
        const db = await openDB();
        await db.add('offlineActions', {
            id: Date.now().toString(),
            action,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Failed to store offline action:', error);
    }
}

// Get stored offline actions
async function getOfflineActions() {
    try {
        const db = await openDB();
        return await db.getAll('offlineActions');
    } catch (error) {
        console.error('Failed to get offline actions:', error);
        return [];
    }
}

// Remove processed offline action
async function removeOfflineAction(id) {
    try {
        const db = await openDB();
        await db.delete('offlineActions', id);
    } catch (error) {
        console.error('Failed to remove offline action:', error);
    }
}

// Process offline action
async function processOfflineAction(actionData) {
    const { action } = actionData;
    
    switch (action.type) {
        case 'chat':
            return await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': action.token
                },
                body: JSON.stringify(action.data)
            });
        default:
            throw new Error(`Unknown action type: ${action.type}`);
    }
}

// Open IndexedDB
async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CalmCompanionDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create offline actions store
            if (!db.objectStoreNames.contains('offlineActions')) {
                const store = db.createObjectStore('offlineActions', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// Push notification handling
self.addEventListener('push', (event) => {
    console.log('Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'You have a new message from Calm Companion',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open App',
                icon: '/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icon-192x192.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Calm Companion', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'STORE_OFFLINE_ACTION') {
        event.waitUntil(storeOfflineAction(event.data.action));
    }
});

console.log('Service Worker loaded successfully');
