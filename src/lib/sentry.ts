/**
 * Sentry Integration for Error Tracking and Performance Monitoring
 * Configure Sentry with GitHub OAuth integration
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry() {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    
    // Environment
    environment: import.meta.env.MODE || 'production',
    
    // Release tracking
    release: `easyflows-pro@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    
    // Performance Monitoring
    integrations: [
      new BrowserTracing({
        // Enable automatic instrumentation of navigations and interactions
        tracingOrigins: [
          'localhost',
          'easyflow-pro.site',
          /^\//,
        ],
        // Capture 100% of transactions for performance monitoring
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          // React Router v6 integration will be set up later
        ),
      }),
    ],
    
    // Performance Monitoring sample rate
    // 1.0 = 100% of transactions, adjust based on traffic
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    
    // Error sampling
    sampleRate: 1.0,
    
    // Capture console messages
    integrations: [
      ...Sentry.defaultIntegrations,
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Session Replay
    // This sets the sample rate at 10%. You may want to change it to 100% while in development
    replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // BeforeSend hook for filtering errors
    beforeSend(event, hint) {
      // Filter out non-error exceptions
      const error = hint.originalException;
      
      // Ignore network errors in development
      if (import.meta.env.MODE === 'development' && error?.toString().includes('NetworkError')) {
        return null;
      }
      
      // Ignore cancelled requests
      if (error?.toString().includes('AbortError') || error?.toString().includes('canceled')) {
        return null;
      }
      
      return event;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'atomicFindClose',
      // Network errors
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
      // React errors that are caught by error boundaries
      'ChunkLoadError',
      'Loading chunk',
    ],
    
    // Breadcrumbs for better debugging
    maxBreadcrumbs: 50,
    
    // Attach stack traces to pure capture message calls
    attachStacktrace: true,
  });
}

/**
 * Set user context for Sentry
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  role?: string;
  username?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
}

/**
 * Start a new transaction for performance tracking
 */
export function startTransaction(name: string, op: string = 'custom') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Error Boundary HOC
 */
export const withSentryErrorBoundary = Sentry.withErrorBoundary;

/**
 * Sentry Error Boundary Component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Profiler for React components
 */
export const SentryProfiler = Sentry.Profiler;
