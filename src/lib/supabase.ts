import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Create Supabase client with retries and proper configuration
export const supabase = createClient(
  env.supabase.url,
  env.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: localStorage,
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-client-info': 'curiosai-web'
      }
    },
    // Add retries for better reliability
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  }
);

// Add error handling wrapper
export async function handleSupabaseOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  retries = 3
): Promise<T> {
  let lastError: Error | null = null;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        await delay(1000 * Math.pow(2, attempt)); // Exponential backoff
      }
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Supabase operation attempt ${attempt + 1} failed:`, {
        error: lastError.message,
        timestamp: new Date().toISOString()
      });
      
      // Check if it's a network error
      if (lastError.message.includes('Failed to fetch')) {
        if (attempt < retries - 1) continue;
        console.warn('Network error persists, using fallback');
      }
    }
  }

  // Log final error and return fallback
  if (lastError) {
    console.error('Supabase operation failed after retries:', {
      error: lastError.message,
      timestamp: new Date().toISOString()
    });
  }

  return fallback;
}

// Export both functions for consistency
export { handleSupabaseOperation as handleSupabaseError };