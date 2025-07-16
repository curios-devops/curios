import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CollapsibleSection from '../components/policies/CollapsibleSection.tsx';
import PrivacyPolicy from '../components/policies/PrivacyPolicy.tsx';
import ServiceTerms from '../components/policies/ServiceTerms.tsx';

export default function Policies() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/');
  };

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
          const button = element.querySelector('button');
          if (button) button.click();
        }, 100);
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Close Button */}
      <button
        type="button"
        onClick={handleClose}
        className="fixed top-6 right-6 z-50 w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-white transition-colors duration-200 border border-gray-600 hover:border-gray-500"
        aria-label="Close and return to home"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M6 18L18 6M6 6l12 12" 
          />
        </svg>
      </button>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-medium text-white mb-4 text-center">Terms & Policies</h1>
        <h2 className="text-2xl font-medium text-gray-400 mb-12">Legal</h2>

        <div className="space-y-4">
          <div id="privacy">
            <CollapsibleSection
              title="Privacy Policy"
              description="Practices with respect to personal information we collect from or about you"
            >
              <PrivacyPolicy />
            </CollapsibleSection>
          </div>

          <div id="terms">
            <CollapsibleSection
              title="Terms of Use"
              description="Terms that govern your use of specific services"
            >
              <ServiceTerms />
            </CollapsibleSection>
          </div>
        </div>
      </main>
    </div>
  );
}