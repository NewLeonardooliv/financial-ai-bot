// Simple logger implementation for Bun compatibility
const isDevelopment = true ||process.env.NODE_ENV === 'development';

interface LogLevel {
  level: string;
  timestamp: string;
  message: string;
  [key: string]: any;
}

class SimpleLogger {
  private service: string;
  private version: string;

  constructor() {
    this.service = 'financial-ai-bot-api';
    this.version = process.env.npm_package_version || '1.0.0';
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const logEntry: LogLevel = {
      level,
      timestamp: new Date().toISOString(),
      message,
      service: this.service,
      version: this.version,
      ...data
    };

    if (isDevelopment) {
      return `${logEntry.timestamp} [${level.toUpperCase()}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`;
    }

    return JSON.stringify(logEntry);
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage('info', message, data));
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage('error', message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('warn', message, data));
  }

  debug(message: string, data?: any): void {
    if (isDevelopment) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  child(module: string): SimpleLogger {
    const childLogger = new SimpleLogger();
    childLogger.service = `${this.service}:${module}`;
    return childLogger;
  }
}

export const logger = new SimpleLogger();

// Create child loggers for different modules
export const createModuleLogger = (module: string) => {
  return logger.child(module);
};
