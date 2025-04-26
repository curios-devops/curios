import AuthButton from './AuthButton.tsx';
import { useAuthButtons } from '../hooks/useAuthButtons.ts';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';

interface AuthButtonGroupProps {
  onSignInClick: () => void;
  onSignUpClick: () => void;
}

export default function AuthButtonGroup({ onSignInClick, onSignUpClick }: AuthButtonGroupProps) {
  const { activeButton, setActiveButton } = useAuthButtons();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  // Set initial active button on mount
  useEffect(() => {
    setActiveButton('signup');
    console.log('Current language:', currentLanguage);
    console.log('Sign Up translation:', t('signUp'));
    console.log('Sign In translation:', t('signIn'));
  }, [setActiveButton, currentLanguage, t]);

  const handleSignInClick = () => {
    setActiveButton('signin');
    onSignInClick();
  };

  const handleSignUpClick = () => {
    setActiveButton('signup');
    onSignUpClick();
  };

  const signUpText = t('signUp');
  const signInText = t('signIn');

  return (
    <div className="flex flex-col gap-3">
      <AuthButton
        type="signup"
        isActive={activeButton === 'signup'}
        onClick={handleSignUpClick}
      >
        {signUpText}
      </AuthButton>
      <AuthButton
        type="signin"
        isActive={activeButton === 'signin'}
        onClick={handleSignInClick}
      >
        {signInText}
      </AuthButton>
    </div>
  );
}