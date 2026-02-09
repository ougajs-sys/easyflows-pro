import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

// Firebase configuration from environment variables
// These values should be set in your .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// VAPID key for web push (public key from Firebase Console)
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Firebase
let app: any;
let messaging: Messaging | null = null;

try {
  app = initializeApp(firebaseConfig);
  
  // Check if messaging is supported (not in all browsers/contexts)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export { messaging };

// Request notification permission and get FCM token
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    if (!messaging) {
      console.warn("Firebase messaging not initialized");
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== "granted") {
      console.log("Notification permission not granted");
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("Service Worker registered:", registration);

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("FCM Token obtained:", token.substring(0, 20) + "...");
      return token;
    } else {
      console.log("No registration token available");
      return null;
    }
  } catch (error) {
    console.error("Error getting notification permission:", error);
    return null;
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) {
    console.warn("Firebase messaging not initialized");
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    callback(payload);
  });
}
