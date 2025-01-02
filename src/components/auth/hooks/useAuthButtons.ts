import { useState } from 'react';

export type AuthButtonType = 'signin' | 'signup';

export function useAuthButtons() {
  // Initialize with 'signup' as the default active button
  const [activeButton, setActiveButton] = useState<AuthButtonType>('signup');

  return {
    activeButton,
    setActiveButton,
  };
}