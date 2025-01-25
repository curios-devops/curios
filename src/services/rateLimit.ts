// Rate limiting queue with improved error handling
class RateLimitQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestCount = 0;
  private lastReset = Date.now();
  private readonly resetInterval = 60000; // 1 minute
  private readonly maxRequestsPerMinute = 30; // Reduced from 50
  private readonly retryDelay = 2000; // 2 seconds between retries

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithRetry(task);
          resolve(result);
        } catch (error) {
          reject(new Error(error instanceof Error ? error.message : 'Task failed'));
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async executeWithRetry<T>(
    task: () => Promise<T>, 
    retries = 2
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await task();
        return result;
      } catch (error) {
        if (
          error instanceof Error && 
          error.message.includes('429') && 
          attempt < retries
        ) {
          await new Promise(resolve => 
            setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
          );
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        if (await this.shouldThrottle()) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          continue;
        }

        const task = this.queue.shift();
        if (task) {
          await task();
          this.requestCount++;
        }
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.processing = false;
    }
  }

  private async shouldThrottle(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastReset >= this.resetInterval) {
      this.requestCount = 0;
      this.lastReset = now;
      return false;
    }

    return this.requestCount >= this.maxRequestsPerMinute;
  }
}

export const rateLimitQueue = new RateLimitQueue();