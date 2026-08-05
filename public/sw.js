// Service Worker for Academy of Excellence PWA
const CACHE_NAME = 'aoe-portal-cache-v2026.08.05';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Purging old Service Worker cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first fetch strategy for fresh content delivery
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request) || caches.match('/admin') || caches.match('/');
      })
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});

// 🔔 Listen for Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Academy of Excellence', body: 'New update received!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Academy of Excellence', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: 'https://rcppfmlyvackmemjousp.supabase.co/storage/v1/object/public/gallery-images/academylogom.svg',
    badge: 'https://rcppfmlyvackmemjousp.supabase.co/storage/v1/object/public/gallery-images/academylogom.svg',
    data: data.url || '/admin',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open Portal' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 🎯 Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient.url !== urlToOpen) {
              return focusedClient.navigate(urlToOpen);
            }
          });
        }
      }
      // If no tab is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
