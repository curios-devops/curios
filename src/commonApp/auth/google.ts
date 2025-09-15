import { supabase } from "../../lib/supabase.ts";
import type { UserType } from "../../types/index.ts";
import type { Provider } from "@supabase/supabase-js";

interface AuthResult { success: boolean; error?: string; }


export async function signInWithGoogle(): Promise<AuthResult> {
  console.log('Inside signInWithGoogle function');
  try {
    const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google" as Provider,
        options: { redirectTo: `${globalThis.location.origin}/auth/callback` },
      });

    if (signInError) {
      console.error("Google sign in error:", signInError);
      return { success: false, error: signInError.message };
    }

    if (!data) {
      return { success: false, error: "No data returned from Google sign-in." };
    }

    if (!('session' in data)) {
      return { success: false, error: 'No session returned from Google sign-in.' };
    }

    const { session } = data as { session: { user: { id: string; email: string | null } } };

   

    if (!session.user)
    {
      
      return { success: false, error: "No user found in the session" };
    }
    const { user } = session;

    if (!('id' in user)) return { success: false, error: 'User not found after Google sign-in.' };

    // Check if user exists in public.profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      if (profileError.code !== 'PGRST116') {
        console.error("Error checking profile:", profileError);
        throw profileError;
      }
    }

    if (!profiles) {
      const { error: profileCreationError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email ?? '',
            user_type: 'free' as UserType,
          },
        ]);

      if (profileCreationError) {
        console.error("Error creating profile:", profileCreationError);
        throw profileCreationError;
      }
    }

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to sign in with Google');
    return { success: false, error: error.message };
  }
}
