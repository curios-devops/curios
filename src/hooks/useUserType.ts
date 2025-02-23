import { useSession } from './useSession';
import { useSubscription } from './useSubscription';

export type UserType = 'guest' | 'standard' | 'premium';

export function useUserType(): UserType {
  const { session } = useSession();
  const { subscription } = useSubscription();

  if (!session) {
    return 'guest';
  }

  if (subscription?.isActive) {
    return 'premium';
  }

  return 'standard';
}