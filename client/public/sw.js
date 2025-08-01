// Service Worker for notification handling
self.addEventListener('install', event => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked');
  event.notification.close();
  
  // Open the app when notification is clicked
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

// Handle background sync for notifications
self.addEventListener('sync', event => {
  if (event.tag === 'daily-reminder') {
    event.waitUntil(handleDailyReminder());
  }
});

async function handleDailyReminder() {
  // Show notification when background sync triggers
  const options = {
    body: 'Don\'t forget to add your daily transactions!',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: 'daily-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Add Transaction'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  await self.registration.showNotification('MacLap Daily Reminder', options);
}