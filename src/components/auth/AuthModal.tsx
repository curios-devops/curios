import React, { useState } from 'react';
import SignInModal from './SignInModal';
import SignUpModal from './SignUpModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
  context?: 'default' | 'pro';
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  defaultMode = 'signup',
  context = 'default'
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);

  if (!isOpen) return null;

  return mode === 'signin' ? (
    <SignInModal 
      isOpen={isOpen} 
      onClose={onClose}
      context={context}
    />
  ) : (
    <SignUpModal 
      isOpen={isOpen} 
      onClose={onClose}
      context={context}
    />
  );
}