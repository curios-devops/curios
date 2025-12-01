import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.ts';
import { ensureProfileExists } from '../lib/ensureProfile.ts';
import { useSession } from './useSession.ts';

export interface Subscription {
  status: string;
  periodEnd: Date | null;
  isActive: boolean;
  isPro: boolean;
}

// Subscription fetch timeout (5 seconds)
const SUBSCRIPTION_FETCH_TIMEOUT = 5000;

export function useSubscription() {
  const { session } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Set timeout for subscription fetch
    fetchTimeoutRef.current = setTimeout(() => {
      console.error('⚠️ Subscription fetch timeout - using fallback');
      setSubscription({
        status: 'inactive',
        periodEnd: null,
        isActive: false,
        isPro: false,
      });
      setLoading(false);
      setError('Subscription fetch timed out');
    }, SUBSCRIPTION_FETCH_TIMEOUT);

    const fetchSubscription = async () => {
      try {
        console.log('🔄 Fetching subscription for user:', session.user.id);
        await ensureProfileExists(session.user);
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_period_end')
          .eq('id', session.user.id)
          .single();

        // Clear timeout on successful fetch
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }

        if (supabaseError) {
          // Use a fallback state for development/demo purposes
          if (import.meta.env.DEV) {
            console.log('ℹ️ Dev mode: Using mock subscription');
            setSubscription({
              status: 'active',
              periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              isActive: true,
              isPro: true,
            });
            return;
          }
          throw supabaseError;
        }

        const now = new Date();
        const periodEnd = data.subscription_period_end ? new Date(data.subscription_period_end) : null;
        const isActive = data.subscription_status === 'active' && (!periodEnd || periodEnd > now);

        setSubscription({
          status: data.subscription_status,
          periodEnd,
          isActive,
          isPro: isActive,
        });

        console.log('✅ Subscription fetched:', {
          userId: session?.user?.id,
          status: data.subscription_status,
          isActive,
          isPro: isActive,
        });
      } catch (error) {
        console.error('❌ Error fetching subscription:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch subscription');
        // Set a basic free tier state as fallback
        setSubscription({
          status: 'inactive',
          periodEnd: null,
          isActive: false,
          isPro: false,
        });
      } finally {
        // Clear timeout and set loading false
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
        setLoading(false);
      }
    };

    fetchSubscription();

    // Cleanup on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };
  }, [session]);

  return {
    subscription,
    loading,
    error,
  };
}