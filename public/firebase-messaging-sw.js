// Firebase Cloud Messaging Service Worker
// This file handles background push notifications

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: These values will be injected at build time or runtime
// For now, they must match your Firebase project configuration
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'EasyFlows Pro';
  const notificationOptions = {
    body: payload.notification?.body || 'Vous avez une nouvelle notification',
    icon: '/pwa-192x192.svg',
    badge: '/pwa-192x192.svg',
    data: payload.data,
    tag: payload.data?.type || 'notification',
    requireInteraction: false,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);
  
  event.notification.close();
  
  // Navigate to appropriate page based on notification type
  const data = event.notification.data;
  let url = '/';
  
  if (data) {
    switch (data.type) {
      case 'new_order':
      case 'order_assigned':
      case 'delivery_assigned':
        url = `/orders`;
        break;
      case 'chat_message':
        url = `/chat`;
        break;
      default:
        url = '/';
    }
  }
  
  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
