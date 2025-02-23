// Browser-compatible logger implementation
class Logger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }

  info(message: string, data?: any) {
    if (this.logLevel === 'debug' || this.logLevel === 'info') {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  warn(message: string, data?: any) {
    if (this.logLevel !== 'error') {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  error(message: string, data?: any) {
    console.error(this.formatMessage('ERROR', message, data));
  }

  debug(message: string, data?: any) {
    if (this.logLevel === 'debug') {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level;
  }
}

// Create singleton instance
export const logger = new Logger();

// Set log level based on environment
if (import.meta.env.DEV) {
  logger.setLogLevel('debug');
} else {
  logger.setLogLevel('info');
}