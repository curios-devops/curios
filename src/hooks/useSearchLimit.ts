import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { useSession } from './useSession';
import { useSubscription } from './useSubscription';
import { useUserType } from './useUserType';

export function useSearchLimit() {
  const { session } = useSession();
  const { subscription } = useSubscription();
  const userType = useUserType();
  const [remainingSearches, setRemainingSearches] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxSearches = subscription?.isPro ? 500 : 5;
  const warningThreshold = Math.floor(maxSearches / 3);

  useEffect(() => {
    if (!session?.user) {
      setRemainingSearches(5);
      setLoading(false);
      return;
    }

    const fetchSearchLimit = async () => {
      try {
        const result = await handleSupabaseError(
          async () => {
            const { data, error } = await supabase
              .from('profiles')
              .select('remaining_searches, searches_reset_at')
              .eq('id', session.user.id)
              .single();

            if (error) throw error;
            return data;
          },
          { remaining_searches: maxSearches, searches_reset_at: new Date().toISOString() }
        );

        // Check if we need to reset the counter
        const resetAt = new Date(result.searches_reset_at);
        const now = new Date();
        const resetInterval = subscription?.isPro ? 30 : 1; // 30 days for pro, 1 day for regular
        
        if (resetAt < new Date(now.getTime() - resetInterval * 24 * 60 * 60 * 1000)) {
          // Reset counter
          const newCount = subscription?.isPro ? 500 : 5;
          await handleSupabaseError(
            async () => {
              await supabase
                .from('profiles')
                .update({
                  remaining_searches: newCount,
                  searches_reset_at: now.toISOString()
                })
                .eq('id', session.user.id);
            },
            null
          );
          
          setRemainingSearches(newCount);
        } else {
          setRemainingSearches(result.remaining_searches);
        }
      } catch (error) {
        console.error('Error fetching search limit:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch search limit');
        // Set default values
        setRemainingSearches(subscription?.isPro ? 500 : 5);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchLimit();
  }, [session, subscription, maxSearches]);

  const decrementSearches = async (isPro: boolean = false) => {
    // For guest users, always allow searches
    if (!session?.user) {
      return true;
    }

    // For regular users, only decrement if using pro search
    if (!subscription?.isPro && !isPro) {
      return true;
    }

    // Check if we have searches left
    if (remainingSearches <= 0) {
      return false;
    }

    try {
      const result = await handleSupabaseError(
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .update({
              remaining_searches: remainingSearches - 1
            })
            .eq('id', session.user.id)
            .select('remaining_searches')
            .single();

          if (error) throw error;
          return data;
        },
        { remaining_searches: remainingSearches - 1 }
      );

      setRemainingSearches(result.remaining_searches);
      return true;
    } catch (error) {
      console.error('Error decrementing searches:', error);
      setError(error instanceof Error ? error.message : 'Failed to update search count');
      return false;
    }
  };

  return {
    remainingSearches,
    maxSearches,
    loading,
    error,
    decrementSearches,
    hasSearchesLeft: remainingSearches > 0,
    showWarning: remainingSearches <= warningThreshold && remainingSearches > 0,
    isProDisabled: remainingSearches === 0
  };
}