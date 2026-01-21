/**
 * STRUCTURED LOGGING CONFIGURATION
 * 
 * Système de logging structuré pour l'application
 * Facilite le debugging et l'analyse des logs en production
 * 
 * Niveaux de log:
 * - ERROR: Erreurs critiques qui nécessitent une attention immédiate
 * - WARN: Avertissements qui peuvent indiquer des problèmes
 * - INFO: Informations générales sur le fonctionnement
 * - DEBUG: Informations détaillées pour le debugging
 */

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  error?: Error;
}

class Logger {
  private context: string;
  private sessionId: string;
  private userId?: string;

  constructor(context: string) {
    this.context = context;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Définir l'utilisateur actuel pour tous les logs
   */
  setUser(userId: string | undefined) {
    this.userId = userId;
  }

  /**
   * Créer une entrée de log structurée
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      data: this.sanitizeData(data),
      userId: this.userId,
      sessionId: this.sessionId,
      error,
    };
  }

  /**
   * Sanitize les données sensibles avant logging
   */
  private sanitizeData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!data) return undefined;

    const sanitized = { ...data };
    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "apiKey",
      "api_key",
      "authorization",
      "credit_card",
      "ssn",
    ];

    const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
          result[key] = "***REDACTED***";
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          result[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Formater et afficher le log
   */
  private log(entry: LogEntry) {
    const { timestamp, level, message, context, data, error } = entry;

    // En production, envoyer à Sentry ou un service de logging
    if (import.meta.env.PROD) {
      this.sendToMonitoring(entry);
    }

    // Format console selon le niveau
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(fullMessage, data, error);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, data);
        break;
      case LogLevel.INFO:
        console.info(fullMessage, data);
        break;
      case LogLevel.DEBUG:
        if (import.meta.env.DEV) {
          console.debug(fullMessage, data);
        }
        break;
    }
  }

  /**
   * Envoyer les logs au système de monitoring
   */
  private async sendToMonitoring(entry: LogEntry) {
    try {
      // En production, envoyer à Sentry, Datadog, etc.
      if (entry.level === LogLevel.ERROR && entry.error) {
        // Importer dynamiquement Sentry pour éviter les erreurs si non configuré
        const { captureException } = await import("./sentry");
        captureException(entry.error, {
          context: entry.context,
          data: entry.data,
        });
      }
    } catch (error) {
      // Ne pas faire crasher l'app si le monitoring échoue
      console.error("Failed to send log to monitoring:", error);
    }
  }

  /**
   * Log une erreur
   */
  error(message: string, error?: Error, data?: Record<string, unknown>) {
    this.log(this.createLogEntry(LogLevel.ERROR, message, data, error));
  }

  /**
   * Log un avertissement
   */
  warn(message: string, data?: Record<string, unknown>) {
    this.log(this.createLogEntry(LogLevel.WARN, message, data));
  }

  /**
   * Log une information
   */
  info(message: string, data?: Record<string, unknown>) {
    this.log(this.createLogEntry(LogLevel.INFO, message, data));
  }

  /**
   * Log pour debugging (seulement en dev)
   */
  debug(message: string, data?: Record<string, unknown>) {
    this.log(this.createLogEntry(LogLevel.DEBUG, message, data));
  }

  /**
   * Mesurer la performance d'une opération
   */
  async measure<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    this.debug(`Starting ${operationName}`);

    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      this.info(`Completed ${operationName}`, {
        duration: `${duration.toFixed(2)}ms`,
        success: true,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.error(`Failed ${operationName}`, error as Error, {
        duration: `${duration.toFixed(2)}ms`,
      });
      
      throw error;
    }
  }
}

/**
 * Créer un logger pour un contexte spécifique
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Logger par défaut pour l'application
 */
export const logger = createLogger("App");

/**
 * Loggers pour différents contextes
 */
export const authLogger = createLogger("Auth");
export const apiLogger = createLogger("API");
export const webhookLogger = createLogger("Webhook");
export const dbLogger = createLogger("Database");
export const uiLogger = createLogger("UI");
