/**
 * Logger utility class for consistent logging across the application
 * Provides different log levels and formatted output
 */

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}

class Logger {
  private isDevelopment: boolean;
  private context?: string;

  constructor(context?: string) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.context = context;
  }

  /**
   * Create a logger instance with a specific context
   */
  static create(context: string): Logger {
    return new Logger(context);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      data,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === LogLevel.WARN || level === LogLevel.ERROR;
    }
    return true;
  }

  private getLogStyle(level: LogLevel): string {
    const styles = {
      [LogLevel.DEBUG]: 'color: #6366f1',
      [LogLevel.INFO]: 'color: #3b82f6',
      [LogLevel.WARN]: 'color: #f59e0b',
      [LogLevel.ERROR]: 'color: #ef4444',
    };
    return styles[level];
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    this.formatMessage(level, message, data);
    const prefix = this.context ? `[${this.context}]` : '';
    const timePrefix = `[${new Date().toLocaleTimeString()}]`;

    if (typeof window !== 'undefined' && this.isDevelopment) {
      // Browser environment with styling
      console.log(
        `%c${timePrefix} ${level} ${prefix}`,
        this.getLogStyle(level),
        message,
        data || ''
      );
    } else {
      // Node environment or production
      const logData = data ? JSON.stringify(data, null, 2) : '';
      console.log(`${timePrefix} ${level} ${prefix} ${message} ${logData}`);
    }
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log warning messages
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log error messages
   */
  error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, {
        errorMessage: error.message,
        stack: error.stack,
        name: error.name,
      });
    } else {
      this.log(LogLevel.ERROR, message, error);
    }
  }

  /**
   * Log API requests (only in development)
   */
  api(method: string, url: string, data?: any): void {
    if (this.isDevelopment) {
      this.debug(`API ${method}`, { url, data });
    }
  }

  /**
   * Log performance metrics (only in development)
   */
  performance(label: string, duration: number): void {
    if (this.isDevelopment) {
      this.debug(`Performance: ${label}`, { duration: `${duration}ms` });
    }
  }
}

// Export singleton instance for general use
export const logger = new Logger();

// Export class for creating contextual loggers
export { Logger };

