import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase, handleSupabaseOperation } from '../lib/supabase.ts';
import { useSession } from './useSession.ts';
import { useSubscription } from './useSubscription.ts';
import { useUserType } from './useUserType.ts';

export function useSearchLimit() {
  const { session } = useSession()
  const { subscription } = useSubscription(session)
  const userType = useUserType() as 'pro' | 'guest' | null;
  const [remainingSearches, setRemainingSearches] = useState<number>(5)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxSearches = useMemo(() => subscription?.isActive ? 500 : 5, [subscription?.isActive]);
  const warningThreshold = useMemo(() => Math.floor(maxSearches / 3), [maxSearches]);

  const fetchSearchLimit = useCallback(async () => {
    setLoading(true);
    try {
      if (!session?.user) {
        setRemainingSearches(5);
      } else {
        const result = await handleSupabaseOperation(
          async () => {
            const { data, error } = await supabase
              .from('profiles')
              .select('remaining_searches, searches_reset_at')
              .eq('id', session.user.id)
              .single();
            if (error) throw error;
            return data;
          }
        );

        if ('code' in result && result.code === -1) {
          setRemainingSearches(userType === "pro" ? 500 : 5);
        } else if ('searches_reset_at' in result && 'remaining_searches' in result) {
          const searchesResetAt = result.searches_reset_at;
          const resetAt = typeof searchesResetAt === 'string' ? new Date(searchesResetAt) : new Date();

          const now = new Date();
          if (resetAt < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {            
            const newCount = maxSearches
            await handleSupabaseOperation(
              async () => {
                await supabase
                  .from('profiles')
                  .update({
                    remaining_searches: newCount,
                    searches_reset_at: now.toISOString(),
                  })
                  .eq('id', session.user.id);
              }
            );
            setRemainingSearches(newCount);
          } else if (typeof result.remaining_searches === 'number') {
            setRemainingSearches(result.remaining_searches as number);
          }          
        }
      }
    } catch (error) {
      console.error('Error fetching search limit:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch search limit');
      setRemainingSearches(subscription?.isActive ? 500 : 5);
    } finally {
      setLoading(false);
    }
  },[session?.user, subscription?.isActive, maxSearches, userType]);

  useEffect(() => {
    fetchSearchLimit();
  }, [fetchSearchLimit]);

  const decrementSearches = useCallback(async (isPro: boolean = false) => {
    if (!session?.user) return true
    if (!subscription?.isActive && !isPro) return true;
    if (remainingSearches <= 0) return false;

    try {
      const result = await handleSupabaseOperation(
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .update({
              remaining_searches: remainingSearches - 1,
            })
            .eq('id', session.user.id)
            .select('remaining_searches')
            .single();
          if (error) throw error;
          return data;
        }
      );

      if ('code' in result && result.code === -1) {
        setError(result.message);
        return false;
      } else if ('remaining_searches' in result) {
        setRemainingSearches(result.remaining_searches as number);
        return true;
      }
    } catch (error) {
      console.error('Error decrementing searches:', error);
      setError(error instanceof Error ? error.message : 'Failed to update search count');
      return false;
    }
  },[remainingSearches,session?.user,subscription?.isActive]);

  return {
    remainingSearches,
    maxSearches,
    loading,
    error,
    decrementSearches,
    hasSearchesLeft: remainingSearches > 0,
    showWarning: remainingSearches <= warningThreshold && remainingSearches > 0,
    isProDisabled: remainingSearches === 0,
  }
}
