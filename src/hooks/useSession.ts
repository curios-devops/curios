import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { Session } from "@supabase/supabase-js";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch initial session
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If there's an auth error (like invalid refresh token), clear the session
        if (error) {
          console.warn('Auth error during session fetch, clearing session:', error.message);
          // Sign out to clear invalid tokens
          await supabase.auth.signOut({ scope: 'local' });
          setSession(null);
        } else {
          setSession(session);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        // Clear any stale session on error
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'User signed in' : 'User signed out');
      
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, signing out locally');
        await supabase.auth.signOut({ scope: 'local' });
      }
      
      setSession(session);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
}
