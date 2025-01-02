import { supabase } from '../../lib/supabase';
import { AUTH_CONFIG } from './config';
import type { AuthResponse } from './types';

export async function sendMagicLink(email: string): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: AUTH_CONFIG.redirectUrl,
        shouldCreateUser: true,
      },
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Magic link error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send magic link'
    };
  }
}