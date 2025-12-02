import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabase.ts";
import { Session } from "@supabase/supabase-js";
import { ensureProfileExists } from "../lib/ensureProfile.ts";

// Session restoration timeout (15 seconds - increased for slower connections)
const SESSION_RESTORE_TIMEOUT = 15000;

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const isInitializedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSessionLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent running twice in StrictMode
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const ensureProfileAndSetSession = async (nextSession: Session | null) => {
      if (nextSession?.user) {
        try {
          await ensureProfileExists(nextSession.user);
        } catch (error) {
          console.warn('Failed to ensure profile exists:', error);
          // Don't fail - continue with session
        }
      }
      setSession(nextSession);
      if (nextSession) {
        setSessionError(null);
      }
    };

    const clearLocalSession = async (reason?: string) => {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (signOutError) {
        console.warn('Failed to clear local session tokens:', signOutError);
      }
      setSession(null);
      setSessionError(reason ?? null);
    };

    // Fetch initial session
    const fetchSession = async () => {
      setIsLoading(true);
      try {
        console.log('🔄 Fetching session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('❌ Auth error during session fetch, clearing session:', error.message);
          await clearLocalSession('Your session expired. Please sign in again.');
          return;
        }

        if (session) {
          console.log('✅ Session found, validating...', session.user.id);
          
          // Start timeout ONLY after we have a session
          // This gives profile/subscription time to load
          timeoutRef.current = setTimeout(() => {
            if (isLoading && !isSessionLoadedRef.current) {
              console.warn('⏰ Session restoration taking >15s - keeping session but stopping loading UI');
              setIsLoading(false);
            }
          }, SESSION_RESTORE_TIMEOUT);
          
          // Validate the session by checking if token is still valid
          try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            // Ignore time skew warnings - these are client-side clock issues, not auth failures
            const isTimeSkewError = userError?.message?.includes('issued in the future') || 
                                   userError?.message?.includes('Check the device clock');
            
            if (userError && !isTimeSkewError) {
              console.warn('❌ Session token invalid, clearing:', userError?.message);
              await clearLocalSession('We could not refresh your session. Please sign in again.');
              return;
            }
            
            if (isTimeSkewError) {
              console.warn('⚠️ Time skew detected but continuing with session');
            }
            
            // If we have a user (even with time skew warning), the session is valid
            if (user || isTimeSkewError) {
              console.log('✅ Session validated successfully');
              await ensureProfileAndSetSession(session);
              // Don't set loading false yet - let markSessionLoaded do that
            } else {
              console.warn('❌ No user returned from getUser, clearing session');
              await clearLocalSession('We could not refresh your session. Please sign in again.');
            }
          } catch (validationError) {
            console.error('❌ Error validating session:', validationError);
            await clearLocalSession('Session validation failed. Please sign in again.');
          }
        } else {
          // No session - clear everything silently
          console.log('ℹ️ No session found (guest user)');
          setSession(null);
          setSessionError(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ Error fetching session:', error);
        await clearLocalSession('We could not reach the auth service. Please try again.');
      }
    };

    fetchSession();

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'User signed in' : 'User signed out');

      // Handle various auth error events
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, signing out locally');
        await clearLocalSession('We could not refresh your session. Please sign in again.');
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setSessionError(null);
        setIsLoading(false);
        return;
      }

      // For signed in or token refreshed with valid session
      if (session) {
        await ensureProfileAndSetSession(session);
      } else {
        setSession(null);
        setSessionError(null);
      }

      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
      // Clear timeout if component unmounts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array - run once on mount

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

  // Callback for other hooks (like useProfile) to signal they've finished loading
  const markSessionLoaded = useCallback(() => {
    console.log('✅ markSessionLoaded called - profile/subscription complete');
    isSessionLoadedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return {
    session,
    isLoading,
    error: sessionError,
    isResetting,
    resetSession,
    markSessionLoaded,
  };
}
