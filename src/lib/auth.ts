import { supabase } from './supabase';
import { AuthError } from '@supabase/supabase-js';
import { AUTH_CONFIG } from '../services/auth/config';
import type { AuthResponse } from '../services/auth/types';

export async function signInWithEmail(email: string): Promise<AuthResponse> {
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
    console.error('Sign in error:', error);
    return {
      success: false,
      error: error instanceof AuthError ? error.message : 'Failed to sign in'
    };
  }
}

// Use the same magic link flow for both sign in and sign up
export const signUpWithEmail = signInWithEmail;

export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: error instanceof AuthError ? error.message : 'Failed to sign out'
    };
  }
}

export async function verifyOtp(email: string, token: string): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('OTP verification error:', error);
    return {
      success: false,
      error: error instanceof AuthError 
        ? error.message === 'Invalid OTP' 
          ? 'Invalid verification code'
          : error.message
        : 'Failed to verify code'
    };
  }
}