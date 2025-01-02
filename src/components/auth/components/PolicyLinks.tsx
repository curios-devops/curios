import React from 'react';

interface PolicyLinksProps {
  onPolicyClick: (section: string) => void;
}

export default function PolicyLinks({ onPolicyClick }: PolicyLinksProps) {
  return (
    <div className="pt-4 text-center text-xs text-gray-500">
      <button
        onClick={() => onPolicyClick('terms')}
        className="hover:text-gray-400 transition-colors"
      >
        Terms of Use
      </button>
      {' | '}
      <button
        onClick={() => onPolicyClick('privacy')}
        className="hover:text-gray-400 transition-colors"
      >
        Privacy Policy
      </button>
    </div>
  );
}