import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSession } from './useSession';
import { useSubscription } from './useSubscription';

export function useSearchLimit() {
  const { session } = useSession();
  const { subscription } = useSubscription();
  const [remainingSearches, setRemainingSearches] = useState<number>(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          // Use fallback values for development/demo
          if (import.meta.env.DEV) {
            setRemainingSearches(subscription?.isPro ? 600 : 6);
            return;
          }
          throw supabaseError;
        }

        // Check if we need to reset the counter
        const resetAt = new Date(data.searches_reset_at);
        const now = new Date();
        
        if (resetAt < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
          // Reset counter
          const newCount = subscription?.isPro ? 600 : 6;
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              remaining_searches: newCount,
              searches_reset_at: now.toISOString()
            })
            .eq('id', session.user.id);

          if (updateError) throw updateError;
          setRemainingSearches(newCount);
        } else {
          setRemainingSearches(data.remaining_searches);
        }
      } catch (error) {
        console.error('Error fetching search limit:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch search limit');
        // Set default values as fallback
        setRemainingSearches(subscription?.isPro ? 600 : 6);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchLimit();
  }, [session, subscription]);

  const decrementSearches = async () => {
    if (!session?.user) return false;

    try {
      // For development/demo, just decrement locally
      if (import.meta.env.DEV) {
        setRemainingSearches(prev => Math.max(0, prev - 1));
        return true;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          remaining_searches: remainingSearches - 1
        })
        .eq('id', session.user.id)
        .select('remaining_searches')
        .single();

      if (error) throw error;

      setRemainingSearches(data.remaining_searches);
      return true;
    } catch (error) {
      console.error('Error decrementing searches:', error);
      return false;
    }
  };

  return {
    remainingSearches,
    loading,
    error,
    decrementSearches,
    hasSearchesLeft: remainingSearches > 0
  };
}