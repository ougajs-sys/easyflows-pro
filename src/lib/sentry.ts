/**
 * SENTRY INTEGRATION
 * 
 * Configuration de Sentry pour le monitoring des erreurs en production
 * 
 * Fonctionnalités:
 * - Capture automatique des erreurs
 * - Tracking des performances
 * - Breadcrumbs pour le contexte
 * - Session replay (optionnel)
 * - Source maps pour le debugging
 * 
 * Documentation: https://docs.sentry.io/platforms/javascript/guides/react/
 */

import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

/**
 * Initialiser Sentry
 * À appeler au démarrage de l'application (main.tsx)
 */
export function initSentry() {
  // Ne pas initialiser en développement local
  if (import.meta.env.DEV) {
    console.log("🔍 Sentry disabled in development mode");
    return;
  }

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

  if (!sentryDsn) {
    console.warn("⚠️ Sentry DSN not configured");
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    
    // Intégrations
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        // Masquer les données sensibles
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Taux d'échantillonnage des traces de performance
    // 1.0 = 100% des transactions sont capturées
    // En production, utiliser 0.1 (10%) pour réduire les coûts
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Taux d'échantillonnage des replays de session
    // 0.1 = 10% des sessions sont enregistrées
    replaysSessionSampleRate: 0.1,
    
    // Taux d'échantillonnage des replays lors d'erreurs
    // 1.0 = 100% des sessions avec erreurs sont enregistrées
    replaysOnErrorSampleRate: 1.0,

    // Environnement
    environment: import.meta.env.MODE,

    // Release pour tracker les déploiements
    release: import.meta.env.VITE_APP_VERSION || "1.0.0",

    // Ignorer certaines erreurs connues
    ignoreErrors: [
      // Erreurs réseau courantes
      "Network request failed",
      "Failed to fetch",
      "NetworkError",
      // Erreurs de navigation
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
    ],

    // Filtrer les breadcrumbs pour éviter les données sensibles
    beforeBreadcrumb(breadcrumb) {
      // Ne pas enregistrer les breadcrumbs de console.log en production
      if (breadcrumb.category === "console" && import.meta.env.PROD) {
        return null;
      }

      // Filtrer les données sensibles des requêtes HTTP
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
        if (breadcrumb.data?.url) {
          // Masquer les tokens dans les URLs
          breadcrumb.data.url = breadcrumb.data.url.replace(
            /([?&])(token|key|secret|password)=[^&]*/gi,
            "$1$2=***"
          );
        }
      }

      return breadcrumb;
    },

    // Filtrer les événements avant envoi
    beforeSend(event, hint) {
      // Ne pas envoyer les erreurs en mode développement
      if (import.meta.env.DEV) {
        console.error("Sentry would send:", event, hint);
        return null;
      }

      // Filtrer les données sensibles
      if (event.request) {
        // Masquer les headers sensibles
        if (event.request.headers) {
          delete event.request.headers["Authorization"];
          delete event.request.headers["Cookie"];
        }

        // Masquer les query strings sensibles
        if (event.request.query_string) {
          event.request.query_string = event.request.query_string.replace(
            /([?&])(token|key|secret|password)=[^&]*/gi,
            "$1$2=***"
          );
        }
      }

      return event;
    },
  });

  console.log("✅ Sentry initialized");
}

/**
 * Capturer une exception manuellement
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (context) {
    Sentry.setContext("additional", context);
  }
  Sentry.captureException(error);
}

/**
 * Capturer un message manuel
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  Sentry.captureMessage(message, level);
}

/**
 * Ajouter un breadcrumb manuel
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

/**
 * Définir l'utilisateur pour le contexte
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  Sentry.setUser(user);
}

/**
 * Ajouter des tags pour filtrer les erreurs
 */
export function setTags(tags: Record<string, string | number | boolean>) {
  Sentry.setTags(tags);
}

/**
 * Wrapper pour les fonctions async avec capture d'erreur
 */
export function withErrorBoundary<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: { onError?: (error: Error) => void }
): T {
  return ((...args: unknown[]) => {
    try {
      const result = fn(...args);
      
      // Si c'est une Promise, capturer les erreurs async
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureException(error);
          if (options?.onError) {
            options.onError(error);
          }
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      captureException(error as Error);
      if (options?.onError) {
        options.onError(error as Error);
      }
      throw error;
    }
  }) as T;
}

/**
 * Performance monitoring pour les opérations critiques
 */
export function measurePerformance<T>(
  name: string,
  operation: () => T | Promise<T>
): T | Promise<T> {
  const transaction = Sentry.startTransaction({
    name,
    op: "custom",
  });

  try {
    const result = operation();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        transaction.finish();
      });
    }
    
    transaction.finish();
    return result;
  } catch (error) {
    transaction.setStatus("internal_error");
    transaction.finish();
    throw error;
  }
}

/**
 * Export pour l'ErrorBoundary React
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Hook pour utiliser Sentry avec React Router
 */
export function useSentryRouting() {
  // Cette fonction sera appelée lors du changement de route
  // pour créer une transaction de performance
  return (location: { pathname: string }) => {
    Sentry.startTransaction({
      name: location.pathname,
      op: "navigation",
    });
  };
}
