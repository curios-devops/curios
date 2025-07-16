import { useSession } from './useSession.ts';
import { Session, User } from '@supabase/supabase-js';

export type UserType = 'free' | 'premium';
export function useUserType(): UserType {
  const { session, isLoading } = useSession(); // use isLoading

  interface CustomUser extends User {
     user_metadata: {
      userType?: UserType;
    };
  }

  interface CustomSession extends Session {
    user: CustomUser;
  }
  
  if (isLoading) return 'free';
  const customSession = session as CustomSession | null;

  return customSession?.user?.user_metadata?.userType === 'premium'
    ? 'premium'
    : 'free';
}

