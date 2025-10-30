import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase, handleSupabaseOperation } from '../lib/supabase.ts';
import { useSession } from './useSession.ts';
import { useUserType } from './useUserType.ts';

export function useProQuota() {
  const { session } = useSession();
  const userType = useUserType();
  const [remainingQuota, setRemainingQuota] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only free users have Pro quota limitations
  const maxQuota = useMemo(() => {
    if (!session) return 0; // Guests can't use Pro features
    if (userType === 'premium') return Infinity; // Premium users have unlimited access
    return 5; // Free users get 5 Pro uses per day
  }, [userType, session]);

  const warningThreshold = useMemo(() => {
    if (maxQuota === Infinity || maxQuota === 0) return 0;
    return Math.floor(maxQuota / 3);
  }, [maxQuota]);

  const fetchProQuota = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Guest users don't need quota tracking
      if (!session?.user) {
        setRemainingQuota(0);
        setLoading(false);
        return;
      }

      // Premium users have unlimited access
      if (userType === 'premium') {
        setRemainingQuota(Infinity);
        setLoading(false);
        return;
      }

      // Free users - fetch from database
      const result = await handleSupabaseOperation(
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('remaining_searches, searches_reset_at')
            .eq('id', session.user.id)
            .single();
          if (error) throw error;
          return data;
        },
        { remaining_searches: 5, searches_reset_at: new Date().toISOString() }
      );

      if ('remaining_searches' in result && 'searches_reset_at' in result) {
        const quotaResetAt = result.searches_reset_at;
        const resetAt = typeof quotaResetAt === 'string' ? new Date(quotaResetAt) : new Date();
        const now = new Date();

        // Check if quota needs to be reset (24 hours passed)
        if (resetAt < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
          const newQuota = 5;
          await handleSupabaseOperation(
            async () => {
              await supabase
                .from('profiles')
                .update({
                  remaining_searches: newQuota,
                  searches_reset_at: now.toISOString(),
                })
                .eq('id', session.user.id);
            },
            null
          );
          setRemainingQuota(newQuota);
        } else if (typeof result.remaining_searches === 'number') {
          setRemainingQuota(result.remaining_searches);
        }
      } else {
        // Fallback case - set default quota
        setRemainingQuota(5);
      }
    } catch (error) {
      console.error('Error fetching Pro quota:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch Pro quota');
      setRemainingQuota(userType === 'free' ? 5 : 0);
    } finally {
      setLoading(false);
    }
  }, [session?.user, userType]);

  useEffect(() => {
    fetchProQuota();
  }, [fetchProQuota]);

  const decrementProQuota = useCallback(async () => {
    // Guest users can't use Pro features
    if (!session?.user) {
      return false;
    }

    // Premium users have unlimited access
    if (userType === 'premium') {
      return true;
    }

    // Free users - check and decrement quota
    if (remainingQuota <= 0) {
      return false;
    }

    try {
      const result = await handleSupabaseOperation(
        async () => {
          const { data, error } = await supabase
            .from('profiles')
            .update({
              remaining_searches: remainingQuota - 1,
            })
            .eq('id', session.user.id)
            .select('remaining_searches')
            .single();
          if (error) throw error;
          return data;
        },
        { remaining_searches: remainingQuota }
      );

      if ('remaining_searches' in result) {
        setRemainingQuota(result.remaining_searches as number);
        return true;
      } else {
        setError('Failed to update Pro quota');
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error decrementing Pro quota:', error);
      setError(error instanceof Error ? error.message : 'Failed to update Pro quota');
      return false;
    }
  }, [remainingQuota, session?.user, userType]);

  return {
    remainingQuota,
    maxQuota,
    loading,
    error,
    decrementProQuota,
    hasProQuotaLeft: userType === 'premium' || remainingQuota > 0,
    showWarning: userType === 'free' && remainingQuota <= warningThreshold && remainingQuota > 0,
    canAccessPro: !!session,
  };
}
