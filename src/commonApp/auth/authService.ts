import { signInWithMagicLink } from './core';
import type { AuthResponse } from './types';

// Use magic link for both signin and signup flows
export const signInWithEmail = signInWithMagicLink;
export const signUpWithEmail = signInWithMagicLink;