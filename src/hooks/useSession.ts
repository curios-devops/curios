import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { Session } from "@supabase/supabase-js";
import { ensureProfileExists } from "../lib/ensureProfile.ts";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const ensureProfileAndSetSession = useCallback(async (nextSession: Session | null) => {
    if (nextSession?.user) {
      try {
        await ensureProfileExists(nextSession.user);
      } catch (error) {
        console.warn('Failed to ensure profile exists:', error);
      }
    }

    setSession(nextSession);
    if (nextSession) {
      setSessionError(null);
    }
  }, []);

  const clearLocalSession = useCallback(async (reason?: string) => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      console.warn('Failed to clear local session tokens:', signOutError);
    }
    setSession(null);
    setSessionError(reason ?? null);
  }, []);

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('Auth error during session fetch, clearing session:', error.message);
        await clearLocalSession('Your session expired. Please sign in again.');
        return;
      }

      if (session) {
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            console.warn('Session token invalid, clearing:', userError?.message);
            await clearLocalSession('We could not refresh your session. Please sign in again.');
            return;
          }

          await ensureProfileAndSetSession(session);
        } catch (validationError) {
          console.error('Error validating session:', validationError);
          await clearLocalSession('Session validation failed. Please sign in again.');
        }
      } else {
        await clearLocalSession();
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      await clearLocalSession('We could not reach the auth service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [clearLocalSession, ensureProfileAndSetSession]);

  useEffect(() => {
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'User signed in' : 'User signed out');

      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, signing out locally');
        await clearLocalSession('We could not refresh your session. Please sign in again.');
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        await clearLocalSession();
        setIsLoading(false);
        return;
      }

      if (session) {
        await ensureProfileAndSetSession(session);
      } else {
        await clearLocalSession();
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearLocalSession, ensureProfileAndSetSession, fetchSession]);

  const resetSession = useCallback(async () => {
    setIsResetting(true);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      await fetchSession();
      setIsResetting(false);
    }
  }, [fetchSession]);

  return {
    session,
    isLoading,
    error: sessionError,
    isResetting,
    resetSession,
  };
}
