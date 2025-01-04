import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSession } from './useSession';
import { useSubscription } from './useSubscription';
import { useUserType } from './useUserType';

export function useSearchLimit() {
  const { session } = useSession();
  const { subscription } = useSubscription();
  const userType = useUserType();
  const [remainingSearches, setRemainingSearches] = useState<number>(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxSearches = subscription?.isPro ? 600 : 6;

  useEffect(() => {
    if (!session?.user) {
      setRemainingSearches(6);
      setLoading(false);
      return;
    }

    const fetchSearchLimit = async () => {
      try {
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('remaining_searches, searches_reset_at')
          .eq('id', session.user.id)
          .single();

        if (supabaseError) {
          throw supabaseError;
        }

        // Check if we need to reset the counter
        const resetAt = new Date(data.searches_reset_at);
        const now = new Date();
        
        if (resetAt < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
          // Reset counter
          const newCount = subscription?.isPro ? 600 : 6;
          await supabase
            .from('profiles')
            .update({
              remaining_searches: newCount,
              searches_reset_at: now.toISOString()
            })
            .eq('id', session.user.id);
          
          setRemainingSearches(newCount);
        } else {
          setRemainingSearches(data.remaining_searches);
        }
      } catch (error) {
        console.error('Error fetching search limit:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch search limit');
        // Set default values
        setRemainingSearches(subscription?.isPro ? 600 : 6);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchLimit();
  }, [session, subscription]);

  const decrementSearches = async () => {
    if (!session?.user) {
      // For non-logged in users, just return true to allow the search
      return true;
    }

    if (remainingSearches <= 0) {
      return false;
    }

    try {
      const { data, error: supabaseError } = await supabase
        .from('profiles')
        .update({
          remaining_searches: remainingSearches - 1
        })
        .eq('id', session.user.id)
        .select('remaining_searches')
        .single();

      if (supabaseError) throw supabaseError;

      setRemainingSearches(data.remaining_searches);
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
    hasSearchesLeft: remainingSearches > 0
  };
}