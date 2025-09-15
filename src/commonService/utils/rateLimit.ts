import { logger } from '../../utils/logger';

export class RateLimitQueue {
  private queue: Array<{
    operation: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    retryCount: number;
    abortController: AbortController;
  }> = []; // Queue of tasks
  private processing = false
  private lastCallTime = 0; // timestamp of the last API call
  private readonly callInterval = 1000; // 1 second interval between API calls
  private readonly retryDelay = 1000; // 1 second delay before retrying
  private readonly maxRetries = 1; // allow at most 1 retry per API call

  // Fatal error patterns for which we do not retry.
  // Note: 'status code 429' has been removed so that 429 errors will trigger a retry.
  private readonly fatalErrorPatterns = [
    'status code 400',
    'status code 526'
  ];

   add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const abortController = new AbortController();

      this.queue.push({
        operation,
        resolve: resolve as (value: unknown) => void,
        reject,
        retryCount: 0,
        abortController,
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    logger.debug('Starting queue processing');

    try {
      while (this.queue.length > 0) {
        // Enforce a 1-second interval between calls.
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;
        if (timeSinceLastCall < this.callInterval) {
          const waitTime = this.callInterval - timeSinceLastCall;
          logger.debug(`Waiting ${waitTime} ms to respect API rate limit`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const task = this.queue[0];

        try {
          const result = await Promise.race([
            task.operation(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Operation timed out')), 20000) // 20-second timeout
            )
          ]);

          task.resolve(result);
          this.queue.shift();
          this.lastCallTime = Date.now();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Check if the error message matches any fatal error pattern.
          if (this.fatalErrorPatterns.some(pattern =>
            errorMessage.toLowerCase().includes(pattern)
          )) {
            logger.warn('Fatal error encountered, not retrying', {
              error: errorMessage,
              retryCount: task.retryCount
            });
            task.reject(error instanceof Error ? error : new Error(errorMessage));
            this.queue.shift();
            this.lastCallTime = Date.now();
            continue;
          }

          // If the error is not fatal, check if we can retry.
          if (task.retryCount < this.maxRetries) {
            task.retryCount++;
            logger.warn(`Retrying task (${task.retryCount}/${this.maxRetries}) due to error: ${errorMessage}`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            // Do not shift the task out of the queue so that it is retried.
            continue;
          }

          // If we've exceeded the max retry count, reject the task and remove it.
          task.reject(error instanceof Error ? error : new Error(errorMessage));
          this.queue.shift();
          this.lastCallTime = Date.now();
        }
      }
    } catch (error) {
      logger.error('Queue processing error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.processing = false;
      logger.debug('Queue processing finished');
    }
  }

  cleanup() {
    this.queue.forEach(task => {
      task.abortController.abort();
    });
    this.queue = [];
    this.processing = false;
    this.lastCallTime = 0;
  }
}

// Create singleton instance with lazy initialization
let rateLimitQueueInstance: RateLimitQueue | null = null;

export const rateLimitQueue = {
  add<T>(operation: () => Promise<T>): Promise<T> {
    if (!rateLimitQueueInstance) {
      rateLimitQueueInstance = new RateLimitQueue();
      
      // Clean up on page unload
      if (typeof globalThis !== 'undefined') {
        globalThis.addEventListener('beforeunload', () => {
          rateLimitQueueInstance?.cleanup();
        });
      }
    }
    return rateLimitQueueInstance.add(operation);
  },
  
  cleanup() {
    if (rateLimitQueueInstance) {
      rateLimitQueueInstance.cleanup();
      rateLimitQueueInstance = null;
    }
  }
};
