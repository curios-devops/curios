import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { AUTH_CONFIG } from '../services/auth/config';

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
      storage: window.localStorage,
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-client-info': 'curiosai-web'
      }
    }
  }
);