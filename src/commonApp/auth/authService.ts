import { signInWithMagicLink, signUpWithMagicLink } from './core';

// Use magic link for both signin and signup flows
export const signInWithEmail = signInWithMagicLink;
export const signUpWithEmail = signUpWithMagicLink;