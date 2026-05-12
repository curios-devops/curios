/**
 * Concurrency Limiter
 * Simple FIFO limiter to cap concurrent async work.
 */

export class ConcurrencyLimiter {
  private activeCount = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.maxConcurrent <= 0) {
      return task();
    }

    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.activeCount += 1;

    try {
      return await task();
    } finally {
      this.activeCount -= 1;
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}