// public/sw.js
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  const data = event.data ? event.data.json() : { title: 'BarberEase Notificación', body: 'Nueva notificación de BarberEase!' };
  console.log(`[Service Worker] Push had this data:`, data);

  const title = data.title || 'BarberEase Notificación';
  const options = {
    body: data.body || 'Revisa tu aplicación para más detalles.',
    icon: data.icon || '/icon-192x192.png', // Example icon path
    badge: data.badge || '/badge-72x72.png', // Example badge path
    data: data.data || { url: self.registration.scope } // URL to open on click
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  const notificationData = event.notification.data;
  const urlToOpen = notificationData && notificationData.url ? notificationData.url : self.registration.scope;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Listen for messages from the client to trigger a notification (for testing)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_TEST_NOTIFICATION') {
    const title = 'Notificación de Prueba (SW)';
    const options = {
      body: event.data.message || 'Esta es una notificación de prueba desde el Service Worker.',
      icon: '/icon-192x192.png', // Example icon, ensure it exists or remove
      data: { url: self.registration.scope }
    };
    self.registration.showNotification(title, options);
  }
});

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  // Perform install steps
  // event.waitUntil(caches.open(CACHE_NAME).then(...));
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  // Perform activation steps (e.g., cleaning up old caches)
  // event.waitUntil(clients.claim()); // Take control of uncontrolled clients
});
