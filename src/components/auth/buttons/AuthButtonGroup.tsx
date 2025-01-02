import React, { useEffect } from 'react';
import AuthButton from './AuthButton';
import { useAuthButtons } from '../hooks/useAuthButtons';

interface AuthButtonGroupProps {
  onSignInClick: () => void;
  onSignUpClick: () => void;
}

export default function AuthButtonGroup({ onSignInClick, onSignUpClick }: AuthButtonGroupProps) {
  const { activeButton, setActiveButton } = useAuthButtons();

  // Set initial active button on mount
  useEffect(() => {
    setActiveButton('signup');
  }, [setActiveButton]);

  const handleSignInClick = () => {
    setActiveButton('signin');
    onSignInClick();
  };

  const handleSignUpClick = () => {
    setActiveButton('signup');
    onSignUpClick();
  };

  return (
    <div className="flex flex-col gap-3">
      <AuthButton
        type="signup"
        isActive={activeButton === 'signup'}
        onClick={handleSignUpClick}
      >
        Sign up
      </AuthButton>
      <AuthButton
        type="signin"
        isActive={activeButton === 'signin'}
        onClick={handleSignInClick}
      >
        Sign in
      </AuthButton>
    </div>
  );
}