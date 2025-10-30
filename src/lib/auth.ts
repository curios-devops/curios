import { supabase } from './supabase.ts';
import { AuthError } from '@supabase/supabase-js';
import { AUTH_CONFIG } from '../commonApp/auth/config';
import { COOKIE_OPTIONS } from '../commonApp/auth/config';
import type { AuthResponse, CookieOptions } from '../commonApp/auth/types';

export async function signInWithEmail(email: string): Promise<Partial<AuthResponse>> {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: AUTH_CONFIG.redirectUrl,
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
    return {
      user: data.user || undefined,
      session: data.session || undefined,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      error:
        error instanceof AuthError
          ? {
              code: error.code,
              message: error.message,
            }
          : {
              message: 'Failed to sign in',
            },
    };
  }
}

export const setCookie = (name: string, value: string, options?: CookieOptions) => {
  const mergedOptions = { ...COOKIE_OPTIONS, ...options };
  let cookieString = `${name}=${value};`;

  if (mergedOptions.maxAge) {
    cookieString += ` Max-Age=${mergedOptions.maxAge};`;
  }

  if (mergedOptions.sameSite) {
    cookieString += ` SameSite=${mergedOptions.sameSite};`;
  }
    if (mergedOptions.secure) {
    cookieString += ` Secure;`;
  }
  document.cookie = cookieString;
};

// Use the same magic link flow for both sign in and sign up
export const signUpWithEmail = signInWithEmail;

export async function signOut(): Promise<Partial<AuthResponse>> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Log the full error object for debugging
      console.error('Supabase signOut error:', error);
      if (error.status) {
        console.error('Supabase signOut error status:', error.status);
      }
      if (error.message) {
        console.error('Supabase signOut error message:', error.message);
      }
      throw error;
    }
    return {
      user: undefined,
      session: undefined,
    };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      error:
        error instanceof AuthError
          ? {
              code: error.code,
              message: error.message,
            }
          : {
              message: error && typeof error === 'object' && 'message' in error ? error.message : 'Failed to sign out',
            },
    };
  }
}

export async function verifyOtp(email: string, token: string): Promise<Partial<AuthResponse>> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    return {
      user: data.user || undefined,
      session: data.session || undefined,
    };
  } catch (error) {
    console.error('OTP verification error:', error);
    return {
      error: error instanceof AuthError
        ? error.message === 'Invalid OTP'
          ? { message: 'Invalid verification code'}
          : { code: error.code, message: error.message}
        : { message: 'Failed to verify code' },
    };
  }
}