import { supabase } from '../../lib/supabase';
import { AUTH_CONFIG } from './config';
import type { AuthResponse } from './types';

export async function signInWithMagicLink(email: string): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: AUTH_CONFIG.redirectUrl,
        shouldCreateUser: false,
      },
    });

    if (error) throw error;
    return { user: undefined, session: undefined, error: undefined };
  } catch (error) {
    console.error('Magic link error:', error);
    return {
      user: undefined,
      session: undefined,
      error: error instanceof Error ? { message: error.message } : { message: 'Failed to send magic link' }
    };
  }
}

export async function signUpWithMagicLink(email: string): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: AUTH_CONFIG.redirectUrl,
        // Allow creating a new user when signing up
        shouldCreateUser: true,
      },
    });

    if (error) throw error;
    return { user: undefined, session: undefined, error: undefined };
  } catch (error) {
    console.error('Magic link (signup) error:', error);
    return {
      user: undefined,
      session: undefined,
      error: error instanceof Error ? { message: error.message } : { message: 'Failed to send magic link' }
    };
  }
}