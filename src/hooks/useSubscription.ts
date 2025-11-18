import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';
import { ensureProfileExists } from '../lib/ensureProfile.ts';
import { useSession } from './useSession.ts';

export interface Subscription {
  status: string;
  periodEnd: Date | null;
  isActive: boolean;
  isPro: boolean;
}

export function useSubscription() {
  const { session } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        await ensureProfileExists(session.user);
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_period_end')
          .eq('id', session.user.id)
          .single();

        if (supabaseError) {
          // Use a fallback state for development/demo purposes
          if (import.meta.env.DEV) {
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
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch subscription');
        // Set a basic free tier state as fallback
        setSubscription({
          status: 'inactive',
          periodEnd: null,
          isActive: false,
          isPro: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [session]);

  return {
    subscription,
    loading,
    error,
  };
}