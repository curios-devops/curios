import { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CookieConsentModalProps {
  onAcceptAll: () => void;
  onNecessaryOnly: () => void;
  onClose: () => void;
  onShowSignUp?: () => void; // Add callback for showing sign up modal
}

export default function CookieConsentModal({ 
  onAcceptAll, 
  onNecessaryOnly,
  onShowSignUp
}: CookieConsentModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  // Check if user has already made a choice
  useEffect(() => {
    const consentChoice = localStorage.getItem('cookieConsent');
    if (!consentChoice) {
      // Show modal after a small delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', 'all');
    setIsVisible(false);
    onAcceptAll();
    // Show sign up modal immediately after accepting cookies
    if (onShowSignUp) {
      setTimeout(() => onShowSignUp(), 100);
    }
  };

  const handleNecessaryOnly = () => {
    localStorage.setItem('cookieConsent', 'necessary');
    setIsVisible(false);
    onNecessaryOnly();
    // Show sign up modal immediately after accepting cookies
    if (onShowSignUp) {
      setTimeout(() => onShowSignUp(), 100);
    }
  };

  const handlePrivacyPolicyClick = () => {
    navigate('/policies#privacy');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-3 right-3 z-50 animate-fade-in">
      <div className="bg-[#2a2a2a] border border-gray-700 rounded-md shadow-xl max-w-[280px] p-3 relative">
        {/* Header with icon */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="p-1 bg-gray-700 rounded-full">
            <Cookie className="text-white" size={12} />
          </div>
          <h3 className="text-white font-medium text-xs">Cookie Policy</h3>
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="text-gray-300 text-[10px] leading-tight">
            We use cookies to enhance your experience. By clicking "Accept All" or "Necessary Only", you agree to our{' '}
            <button
              type="button"
              onClick={handlePrivacyPolicyClick}
              className="text-[#007BFF] hover:text-[#0056b3] underline transition-colors"
            >
              privacy policy
            </button>
            .
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleNecessaryOnly}
            className="flex-1 bg-[#007BFF] hover:bg-[#0056b3] text-white font-medium py-1.5 px-2 rounded text-[10px] transition-colors"
          >
            Necessary Only
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-1.5 px-2 rounded text-[10px] transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
