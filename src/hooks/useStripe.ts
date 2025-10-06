import { useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useSession } from './useSession';
import { createCheckoutSession, checkSubscription } from '../commonApp/stripe/api';
import { STRIPE_CONFIG } from '../commonApp/stripe/config';

// Lazy-load Stripe only when needed (not on module import)
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    if (!STRIPE_CONFIG.publishableKey) {
      throw new Error('Stripe publishable key is missing');
    }
    stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);
  }
  return stripePromise;
};

export function useStripe() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckoutSession = async (interval: 'month' | 'year') => {
    try {
      setLoading(true);
      setError(null);

      // Lazy-load Stripe only when checkout is initiated
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }
      
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