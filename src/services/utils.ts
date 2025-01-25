import { delay } from './utils';

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  timeout?: number;
  exponentialBackoff?: boolean;
}

export const sanitizeResponse = (data: any): any => {
  if (data === null || data === undefined) return null;
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item));
  }
  
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && !(value instanceof Symbol)) {
        cleaned[key] = sanitizeResponse(value);
      }
    }
    return cleaned;
  }
  
  return data;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < options.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Calculate delay with exponential backoff if enabled
        const delayTime = options.exponentialBackoff
          ? options.delayMs * Math.pow(2, attempt) // Exponential backoff
          : options.delayMs;

        console.log(`Retry attempt ${attempt + 1}/${options.maxRetries} after ${delayTime}ms delay`);
        await delay(delayTime);
      }

      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 
          options.timeout || 15000)
        ),
      ]);

      return sanitizeResponse(result);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Special handling for rate limit errors
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('Rate limit hit, applying exponential backoff...');
        // Force exponential backoff for rate limits
        const rateLimitDelay = options.delayMs * Math.pow(2, attempt + 1);
        await delay(rateLimitDelay);
        continue;
      }

      console.warn(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      // If it's not a timeout error and we have more retries, continue
      if (!(error instanceof Error && error.name === 'TimeoutError') && attempt < options.maxRetries - 1) {
        continue;
      }
      
      // If it's the last attempt or a timeout, throw the error
      throw lastError;
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}