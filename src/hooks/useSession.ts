import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { Session } from "@supabase/supabase-js";
import { ensureProfileExists } from "../lib/ensureProfile.ts";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) {
            throw error;
          }
          setSession(session);
          
          // Non-blocking profile check
          if (session?.user) {
            ensureProfileExists(session.user).catch(err => 
              console.warn('Profile check failed (non-critical):', err)
            );
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) {
          setSessionError(error instanceof Error ? error.message : 'Failed to get session');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setIsLoading(false);
        
        // Non-blocking profile check on auth change
        if (session?.user) {
          ensureProfileExists(session.user).catch(err => 
            console.warn('Profile check failed (non-critical):', err)
          );
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const resetSession = async () => {
    setIsResetting(true);
    try {
      await supabase.auth.signOut({ scope: 'local' });
      setSession(null);
      setSessionError(null);
      
      // Refetch session after clearing
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    } catch (error) {
      console.error('Error resetting session:', error);
      setSessionError('Failed to reset session. Please refresh the page.');
    } finally {
      setIsResetting(false);
      setIsLoading(false);
    }
  };

  return {
    session,
    isLoading,
    error: sessionError,
    isResetting,
    resetSession,
  };
}
