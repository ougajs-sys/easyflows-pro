/**
 * Structured Logging Configuration
 * Provides consistent logging across the application
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private minLevel: LogLevel;
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minIndex = levels.indexOf(this.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  /**
   * Store log entry
   */
  private storeLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Format log message for console
   */
  private formatMessage(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
    ];

    if (entry.context?.component) {
      parts.push(`[${entry.context.component}]`);
    }

    parts.push(entry.message);

    return parts.join(' ');
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.storeLog(entry);
    
    console.debug(this.formatMessage(entry), context?.metadata);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext) {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.storeLog(entry);
    
    console.info(this.formatMessage(entry), context?.metadata);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext) {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.storeLog(entry);
    
    console.warn(this.formatMessage(entry), context?.metadata);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext) {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.storeLog(entry);
    
    console.error(this.formatMessage(entry), error, context?.metadata);
  }

  /**
   * Get all logs
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get logs count by level
   */
  getLogCounts(): Record<LogLevel, number> {
    return {
      [LogLevel.DEBUG]: this.logs.filter(l => l.level === LogLevel.DEBUG).length,
      [LogLevel.INFO]: this.logs.filter(l => l.level === LogLevel.INFO).length,
      [LogLevel.WARN]: this.logs.filter(l => l.level === LogLevel.WARN).length,
      [LogLevel.ERROR]: this.logs.filter(l => l.level === LogLevel.ERROR).length,
    };
  }
}

// Export singleton instance
export const logger = new Logger(
  import.meta.env.MODE === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

// Export convenience functions
export const logDebug = (message: string, context?: LogContext) => 
  logger.debug(message, context);

export const logInfo = (message: string, context?: LogContext) => 
  logger.info(message, context);

export const logWarn = (message: string, context?: LogContext) => 
  logger.warn(message, context);

export const logError = (message: string, error?: Error, context?: LogContext) => 
  logger.error(message, error, context);
