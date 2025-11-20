import { useState, ReactNode } from 'react';
import { useSession } from '../../hooks/useSession';
import { createCheckoutSession } from '../../commonApp/stripe/api';

interface CheckoutButtonProps {
  interval: 'month' | 'year';
  disabled?: boolean;
  loading?: boolean;
  onError?: (error: string) => void;
  className?: string;
  children?: ReactNode;
}

// Stripe is now truly lazy-loaded only when checkout is clicked

export default function CheckoutButton({
  interval,
  disabled = false,
  loading: externalLoading = false,
  onError,
  className = '',
  children
}: CheckoutButtonProps) {
  const { session, error: sessionError, resetSession, isResetting } = useSession();
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = externalLoading || internalLoading || isResetting;

  const handleClick = async () => {
    try {
      setInternalLoading(true);
      
      if (sessionError) {
        await resetSession();
        throw new Error('Refreshing your session. Please try again.');
      }

      if (!session?.user) {
        throw new Error('You must be logged in to subscribe');
      }
      
      // Create checkout session directly without loading Stripe client-side
      const { url } = await createCheckoutSession(
        session.user.id,
        session.user.email || '',
        interval
      );

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
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
  disabled={disabled || loading || isResetting}
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