import { supabase } from "../../lib/supabase.ts";
import type { UserType } from "../../types/index.ts";
import type { Provider } from "@supabase/supabase-js";

interface AuthResult { success: boolean; error?: string; }


export async function signInWithGoogle(): Promise<AuthResult> {
  console.log('Starting Google OAuth sign-in');
  try {
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google" as Provider,
      options: { 
        redirectTo: `${globalThis.location.origin}/auth/callback`,
        skipBrowserRedirect: false
      },
    });

    if (signInError) {
      console.error("Google sign in error:", signInError);
      return { success: false, error: signInError.message };
    }

    // OAuth will redirect the user to Google - no session yet
    // The callback handler will process the session after redirect
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to sign in with Google');
    console.error('Google OAuth error:', error);
    return { success: false, error: error.message };
  }
}
