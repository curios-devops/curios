import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useStripe } from '../../hooks/useStripe';

interface CheckoutButtonProps {
  interval: 'month' | 'year';
  disabled?: boolean;
  loading?: boolean;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
}

// Initialize Stripe outside component to avoid re-initialization
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutButton({
  interval,
  disabled = false,
  loading: externalLoading = false,
  onError,
  className = '',
  children
}: CheckoutButtonProps) {
  const { createCheckoutSession, loading: internalLoading } = useStripe();
  const loading = externalLoading || internalLoading;

  const handleClick = async () => {
    try {
      // Validate Stripe initialization
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      // Create checkout session
      const url = await createCheckoutSession(interval);
      if (!url) {
        throw new Error('Failed to create checkout session');
      }

      console.log('Redirecting to Stripe Checkout:', url);
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Show user-friendly error message
      onError?.(
        error instanceof Error 
          ? error.message 
          : 'Failed to start checkout. Please try again.'
      );
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        w-full py-3 rounded-lg transition-colors flex items-center justify-center gap-2
        ${loading 
          ? 'bg-[#007BFF]/50 cursor-not-allowed' 
          : 'bg-[#007BFF] hover:bg-[#0056b3]'
        }
        text-white
        ${className}
      `}
    >
      {loading ? (
        <>
          <span className="animate-spin">⚪</span>
          Processing...
        </>
      ) : children || 'Upgrade to Pro'}
    </button>
  );
}