import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CollapsibleSection from '../components/policies/CollapsibleSection';
import PrivacyPolicy from '../components/policies/PrivacyPolicy';
import ServiceTerms from '../components/policies/ServiceTerms';

export default function Policies() {
  const location = useLocation();

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
    <div className="min-h-screen bg-black">
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