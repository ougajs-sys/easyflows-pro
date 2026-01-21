import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import bugsnagClient from "./lib/bugsnag";

// Initialize BugSnag for error tracking
if (import.meta.env.VITE_BUGSNAG_API_KEY) {
    console.log("✅ BugSnag initialized successfully");
} else {
    console.warn("⚠️ BugSnag API Key not configured. Error tracking disabled.");
}

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);