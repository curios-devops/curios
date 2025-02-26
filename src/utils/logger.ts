// Browser-compatible logger implementation
const MAX_STRING_LENGTH = 5000; // Reduced to be extra safe
const MAX_STACK_LENGTH = 1000; // Limit for stack traces
const MAX_ERROR_LENGTH = 500; // Limit for error messages

function safeStringify(data: any): string {
  try {
    // Special handling for Error objects
    if (data instanceof Error) {
      return JSON.stringify({
        message: data.message.substring(0, MAX_ERROR_LENGTH),
        stack: data.stack?.substring(0, MAX_STACK_LENGTH),
        name: data.name
      });
    }

    // Handle circular references and limit string length
    const seen = new WeakSet();
    const stringified = JSON.stringify(data, (key, value) => {
      // Handle Error objects in nested structures
      if (value instanceof Error) {
        return {
          message: value.message.substring(0, MAX_ERROR_LENGTH),
          stack: value.stack?.substring(0, MAX_STACK_LENGTH),
          name: value.name
        };
      }

      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
        
        // Truncate large arrays
        if (Array.isArray(value) && value.length > 100) {
          return [...value.slice(0, 100), `[${value.length - 100} more items]`];
        }
      }
      
      // Truncate long strings
      if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
        return value.substring(0, MAX_STRING_LENGTH) + '... [truncated]';
      }
      
      return value;
    });

    return stringified;
  } catch (error) {
    return '[Unable to stringify data]';
  }
}

class Logger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${safeStringify(data)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }

  info(message: string, data?: any) {
    if (this.logLevel === 'debug' || this.logLevel === 'info') {
      try {
        console.info(this.formatMessage('INFO', message, data));
      } catch (error) {
        console.info(`[${new Date().toISOString()}] INFO: ${message} [Error logging data]`);
      }
    }
  }

  warn(message: string, data?: any) {
    if (this.logLevel !== 'error') {
      try {
        console.warn(this.formatMessage('WARN', message, data));
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] WARN: ${message} [Error logging data]`);
      }
    }
  }

  error(message: string, data?: any) {
    try {
      console.error(this.formatMessage('ERROR', message, data));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ERROR: ${message} [Error logging data]`);
    }
  }

  debug(message: string, data?: any) {
    if (this.logLevel === 'debug') {
      try {
        console.debug(this.formatMessage('DEBUG', message, data));
      } catch (error) {
        console.debug(`[${new Date().toISOString()}] DEBUG: ${message} [Error logging data]`);
      }
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