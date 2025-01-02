import { useSession } from './useSession';
import { useSubscription } from './useSubscription';

export type UserType = 'guest' | 'user' | 'pro';

export function useUserType() {
  const { session } = useSession();
  const { subscription } = useSubscription();

  if (!session) {
    return 'guest' as const;
  }

  if (subscription?.isPro) {
    return 'pro' as const;
  }

  return 'user' as const;
}