/**
 * Sentry Integration for Error Monitoring
 * Provides comprehensive error tracking and performance monitoring
 */

import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

/**
 * Initialize Sentry with configuration
 * Call this once at application startup
 */
export async function initializeSentry(): Promise<void> {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || "development";

  // Don't initialize if no DSN is provided
  if (!sentryDsn) {
    console.warn("⚠️ Sentry DSN not configured. Error tracking disabled.");
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment,
      
      // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: environment === "production" ? 0.1 : 1.0,
      
      // Integrations
      integrations: [
        new BrowserTracing({
          // Set `tracePropagationTargets` to control what URLs distributed tracing should be enabled for
          tracePropagationTargets: [
            "localhost",
            /^https:\/\/.*\.supabase\.co/,
            /^https:\/\/easyflow-pro\.site/,
          ],
        }),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Filter out sensitive information
      beforeSend(event, hint) {
        // Remove sensitive data from event
        if (event.request) {
          delete event.request.cookies;
          
          // Redact authorization headers (case-insensitive)
          if (event.request.headers) {
            const headers = event.request.headers as Record<string, string>;
            Object.keys(headers).forEach(key => {
              if (key.toLowerCase() === 'authorization') {
                headers[key] = '[Redacted]';
              }
            });
          }
        }

        // Filter out low-priority errors in development
        if (environment === "development") {
          const error = hint.originalException;
          if (error instanceof Error) {
            // Ignore some common development errors
            if (
              error.message.includes("ResizeObserver") ||
              error.message.includes("Non-Error promise rejection")
            ) {
              return null;
            }
          }
        }

        return event;
      },

      // Ignore specific errors
      ignoreErrors: [
        // Browser extensions
        "top.GLOBALS",
        "chrome-extension://",
        "moz-extension://",
        // Random plugins/extensions
        "Can't find variable: ZiteReader",
        "jigsaw is not defined",
        // Network errors
        "NetworkError",
        "Failed to fetch",
        // React hydration warnings (not critical)
        "Hydration failed",
      ],
    });

    console.log("✅ Sentry initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Sentry:", error);
  }
}

/**
 * Capture an exception manually
 * @param error - Error object or string
 * @param context - Additional context for the error
 */
export async function captureException(
  error: Error | string,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const errorObj = typeof error === "string" ? new Error(error) : error;
    
    if (context) {
      Sentry.withScope((scope) => {
        // Add context to the error
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value as Record<string, unknown>);
        });
        Sentry.captureException(errorObj);
      });
    } else {
      Sentry.captureException(errorObj);
    }
  } catch (err) {
    console.error("Failed to capture exception in Sentry:", err);
  }
}

/**
 * Capture a message (for non-error events)
 * @param message - Message to log
 * @param level - Severity level
 * @param context - Additional context
 */
export async function captureMessage(
  message: string,
  level: "debug" | "info" | "warning" | "error" | "fatal" = "info",
  context?: Record<string, unknown>
): Promise<void> {
  try {
    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value as Record<string, unknown>);
        });
        Sentry.captureMessage(message, level);
      });
    } else {
      Sentry.captureMessage(message, level);
    }
  } catch (err) {
    console.error("Failed to capture message in Sentry:", err);
  }
}

/**
 * Set user context for error tracking
 * @param user - User information
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  try {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } catch (err) {
    console.error("Failed to set user context in Sentry:", err);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  try {
    Sentry.setUser(null);
  } catch (err) {
    console.error("Failed to clear user context in Sentry:", err);
  }
}

/**
 * Add breadcrumb for debugging
 * @param message - Breadcrumb message
 * @param category - Category of breadcrumb
 * @param level - Severity level
 * @param data - Additional data
 */
export function addBreadcrumb(
  message: string,
  category: string = "custom",
  level: "debug" | "info" | "warning" | "error" | "fatal" = "info",
  data?: Record<string, unknown>
): void {
  try {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
    });
  } catch (err) {
    console.error("Failed to add breadcrumb in Sentry:", err);
  }
}

/**
 * Start a transaction for performance monitoring
 * @param name - Transaction name
 * @param op - Operation type
 * @returns Transaction object
 */
export function startTransaction(
  name: string,
  op: string = "custom"
): Sentry.Transaction | null {
  try {
    return Sentry.startTransaction({
      name,
      op,
    });
  } catch (err) {
    console.error("Failed to start transaction in Sentry:", err);
    return null;
  }
}

/**
 * Set tag for filtering errors
 * @param key - Tag key
 * @param value - Tag value
 */
export function setTag(key: string, value: string): void {
  try {
    Sentry.setTag(key, value);
  } catch (err) {
    console.error("Failed to set tag in Sentry:", err);
  }
}

/**
 * Set extra context data
 * @param key - Context key
 * @param value - Context value
 */
export function setExtra(key: string, value: unknown): void {
  try {
    Sentry.setExtra(key, value);
  } catch (err) {
    console.error("Failed to set extra context in Sentry:", err);
  }
}

// Export Sentry for direct access if needed
export { Sentry };
