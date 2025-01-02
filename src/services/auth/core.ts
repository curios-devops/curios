import { supabase } from '../../lib/supabase';
import { AUTH_CONFIG } from './config';
import type { AuthResponse } from './types';

export async function signInWithMagicLink(email: string): Promise<AuthResponse> {
  try {
    // First check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: AUTH_CONFIG.redirectUrl,
        shouldCreateUser: true,
        data: {
          email,
          // Add any additional user metadata here
        }
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