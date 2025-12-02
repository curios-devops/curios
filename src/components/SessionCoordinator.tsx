/**
 * SessionCoordinator
 * 
 * Coordinates the loading states between useSession and useSubscription
 * to prevent premature logout while maintaining freeze protection.
 * 
 * This component wraps the app and ensures that:
 * 1. Session restoration doesn't timeout while profile/subscription loads
 * 2. We have a fallback timeout (15s) for true failures
 * 3. Loading UI only shows during initial session check, not profile fetch
 */

import { useEffect, ReactNode } from 'react';
import { useSession } from '../hooks/useSession';
import { useSubscription } from '../hooks/useSubscription';

interface SessionCoordinatorProps {
  children: ReactNode;
}

export function SessionCoordinator({ children }: SessionCoordinatorProps) {
  const { session, isLoading: sessionLoading, markSessionLoaded } = useSession();
  const { subscription, loading: subscriptionLoading } = useSubscription(markSessionLoaded);

  // Log coordinated state for debugging
  useEffect(() => {
    console.log('🔄 Session Coordinator State:', {
      hasSession: !!session,
      sessionLoading,
      subscriptionLoading,
      subscriptionStatus: subscription?.status,
    });
  }, [session, sessionLoading, subscriptionLoading, subscription]);

  // Show loading UI only during initial session check
  // Don't wait for profile/subscription - those can load in background
  if (sessionLoading && !session) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#1a1a1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#0095FF] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
