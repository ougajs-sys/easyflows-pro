import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import bugsnagClient from "./lib/bugsnag";
import { registerSW } from 'virtual:pwa-register';

// Initialize BugSnag for error tracking
if (import.meta.env.VITE_BUGSNAG_API_KEY) {
    console.log("✅ BugSnag initialized successfully");
} else {
    console.warn("⚠️ BugSnag API Key not configured. Error tracking disabled.");
}

// Register PWA service worker as a module
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New content available, will update on next page load');
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work offline');
  },
  onRegisteredSW(swUrl, registration) {
    console.log('[PWA] Service Worker registered:', swUrl);
  },
  onRegisterError(error) {
    console.error('[PWA] Service Worker registration error:', error);
  }
});

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);