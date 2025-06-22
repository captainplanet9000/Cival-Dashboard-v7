// Cival Dashboard Service Worker
// PWA Support for Offline Trading Dashboard
// Generated on December 15, 2025

const CACHE_NAME = 'cival-dashboard-v2.0.0';
const STATIC_CACHE = 'cival-static-v2.0.0';
const API_CACHE = 'cival-api-v2.0.0';

// Files to cache for offline support
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/trading',
  '/analytics',
  '/agents',
  '/portfolio',
  '/risk',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/pages/_app.js',
  '/favicon.ico',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/vercel.svg',
  '/window.svg'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/health',
  '/api/portfolio',
  '/api/market',
  '/api/strategies',
  '/api/agents/status'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Error caching static files:', error);
      })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients
  return self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      handleApiRequest(request)
    );
    return;
  }
  
  // Handle static assets
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico')) {
    event.respondWith(
      handleStaticRequest(request)
    );
    return;
  }
  
  // Handle page requests
  if (request.destination === 'document') {
    event.respondWith(
      handlePageRequest(request)
    );
    return;
  }
  
  // Default: try network first, fallback to cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Handle API requests with cache-first strategy for some endpoints
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Cache-first for non-critical endpoints
  if (API_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
    try {
      const cache = await caches.open(API_CACHE);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        // Return cached response and update in background
        updateCache(cache, request);
        return cachedResponse;
      }
      
      // Fetch and cache
      const response = await fetch(request);
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
      
    } catch (error) {
      console.error('[ServiceWorker] API request failed:', error);
      
      // Return offline fallback for critical endpoints
      if (url.pathname.includes('/api/portfolio') || 
          url.pathname.includes('/api/market')) {
        return new Response(JSON.stringify({
          offline: true,
          message: 'Offline mode - cached data may be outdated',
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      throw error;
    }
  }
  
  // Network-first for other API requests
  try {
    return await fetch(request);
  } catch (error) {
    console.error('[ServiceWorker] Network request failed:', error);
    throw error;
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch and cache if not found
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
    
  } catch (error) {
    console.error('[ServiceWorker] Static request failed:', error);
    throw error;
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    // Try network first for pages
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    console.error('[ServiceWorker] Page request failed:', error);
    
    // Try cache for offline support
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to main page for SPA routing
    const fallbackResponse = await caches.match('/');
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    // Ultimate fallback
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cival Dashboard - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 50px;
              background: #f5f5f5;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.5; }
            .retry-btn {
              background: #007bff;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 4px;
              cursor: pointer;
              margin-top: 20px;
            }
            .retry-btn:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 Cival Dashboard</h1>
            <h2>🔌 Offline Mode</h2>
            <p>You're currently offline. Some features may be limited.</p>
            <p>The dashboard will automatically reconnect when your internet connection is restored.</p>
            <button class="retry-btn" onclick="window.location.reload()">
              🔄 Retry Connection
            </button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background cache update
async function updateCache(cache, request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      await cache.put(request, response);
    }
  } catch (error) {
    console.log('[ServiceWorker] Background cache update failed:', error);
  }
}

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New trading alert',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'trading-alert',
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View Dashboard'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Cival Dashboard',
        options
      )
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Handle sync events (future feature for offline actions)
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-trading-data') {
    event.waitUntil(syncTradingData());
  }
});

// Sync trading data when connection is restored
async function syncTradingData() {
  try {
    console.log('[ServiceWorker] Syncing trading data...');
    // Future: implement offline action sync
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

// Handle background messages
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[ServiceWorker] Service Worker loaded - Cival Dashboard v2.0.0');