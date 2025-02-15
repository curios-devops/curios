import { useState } from 'react';
import { useSession } from './useSession';
import { createCheckoutSession, checkSubscription } from '../services/stripe/api';

export function useStripe() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckoutSession = async (interval: 'month' | 'year') => {
    try {
      setLoading(true);
      setError(null);
      
      if (!session?.user) {
        throw new Error('You must be logged in to subscribe');
      }

      const { url } = await createCheckoutSession(
        session.user.id,
        session.user.email || '',
        interval
      );

      return url;
    } catch (error) {
      const message = error instanceof Error 
        ? error.message 
        : 'Failed to create checkout session';
      console.error('Subscription error:', error);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifySubscription = async () => {
    if (!session?.user) return false;
    return checkSubscription(session.user.id);
  };

  return {
    loading,
    error,
    createCheckoutSession: handleCheckoutSession,
    verifySubscription,
  };
}