import React from 'react';
import { Session } from '@supabase/supabase-js';
import AuthButtonGroup from './buttons/AuthButtonGroup';
import UserMenu from './UserMenu';

interface AuthButtonsProps {
  session: Session | null;
  isCollapsed?: boolean;
  onSignInClick: () => void;
  onSignUpClick: () => void;
}

export default function AuthButtons({ 
  session, 
  isCollapsed,
  onSignInClick, 
  onSignUpClick 
}: AuthButtonsProps) {
  if (!session) {
    return (
      <AuthButtonGroup
        onSignInClick={onSignInClick}
        onSignUpClick={onSignUpClick}
      />
    );
  }

  return <UserMenu email={session.user.email || ''} isCollapsed={isCollapsed} />;
}