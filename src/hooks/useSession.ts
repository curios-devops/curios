import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { Session } from "@supabase/supabase-js";
import { ensureProfileExists } from "../lib/ensureProfile.ts";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ensureProfileAndSetSession = async (nextSession: Session | null) => {
      if (nextSession?.user) {
        try {
          await ensureProfileExists(nextSession.user);
        } catch (error) {
          console.warn('Failed to ensure profile exists:', error);
        }
      }
      setSession(nextSession);
    };

    // Fetch initial session
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If there's an auth error (like invalid refresh token), clear the session
        if (error) {
          console.warn('Auth error during session fetch, clearing session:', error.message);
          // Sign out to clear invalid tokens - force clear storage
          await supabase.auth.signOut({ scope: 'local' });
          setSession(null);
        } else if (session) {
          // Validate the session by checking if token is still valid
          try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
              console.warn('Session token invalid, clearing:', userError?.message);
              await supabase.auth.signOut({ scope: 'local' });
              setSession(null);
            } else {
              await ensureProfileAndSetSession(session);
            }
          } catch (e) {
            console.error('Error validating session:', e);
            await supabase.auth.signOut({ scope: 'local' });
            setSession(null);
          }
        } else {
          // No session
          setSession(null);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        // Clear any stale session on error
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'User signed in' : 'User signed out');
      
      // Handle various auth error events
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, signing out locally');
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
        setIsLoading(false);
        return;
      }
      
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setIsLoading(false);
        return;
      }
      
      // For signed in or token refreshed with valid session
      if (session) {
        await ensureProfileAndSetSession(session);
      } else {
        setSession(null);
      }
      
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
}
