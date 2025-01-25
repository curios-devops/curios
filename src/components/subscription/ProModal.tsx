import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import CheckoutButton from './CheckoutButton';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProModal({ isOpen, onClose }: ProModalProps) {
  const { session } = useSession();
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] w-full max-w-[900px] p-8 rounded-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold text-white mb-1">Upgrade to Pro</h2>
          <p className="text-gray-400">Unlock the full potential of advanced AI with Pro features</p>
          {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}

          <div className="flex justify-center items-center mt-4">
            <button
              onClick={() => setSelectedInterval('month')}
              className={`px-4 py-2 rounded-l-lg text-sm font-medium ${selectedInterval === 'month' ? 'bg-[#007BFF] text-white' : 'bg-[#333333] text-gray-400'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedInterval('year')}
              className={`px-4 py-2 rounded-r-lg text-sm font-medium ${selectedInterval === 'year' ? 'bg-[#007BFF] text-white' : 'bg-[#333333] text-gray-400'}`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Free Plan */}
          <div className="bg-[#222222] p-6 rounded-xl border border-gray-800 flex flex-col justify-between h-full">
            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-medium text-white mb-4">Free</h3>
                <div className="flex items-center justify-center gap-2 mb-16">
                  <span className="text-gray-400 text-sm">Forever</span>
                </div>
              </div>

              <ul className="space-y-4 mb-6 border-t border-gray-700 pt-4">
                <Feature text="Unlimited Quick searches" />
                <Feature text="5 Pro searches per day" />
                <Feature text="Standard AI model optimized for speed" />
                <Feature text="Create a profile to personalize answers" />
              </ul>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Continue with Free
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-[#222222] p-6 rounded-xl border border-gray-800 flex flex-col justify-between h-full">
            <div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-medium text-white mb-2">Pro</h3>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold text-white">
                    {selectedInterval === 'month' ? '$10' : '$50'}
                  </span>
                  <span className="text-gray-400">
                    {selectedInterval === 'month' ? '/month' : '/year'}
                  </span>
                </div>
                <div className="mt-2 h-6">
                  {selectedInterval === 'year' && (
                    <span className="text-[#00B4D8] text-sm">Save 60%</span>
                  )}
                </div>
              </div>

              <ul className="space-y-4 mb-6 border-t border-gray-700 pt-4">
                <Feature text="Unlimited Quick searches" />
                <Feature text="500+ Pro searches per day" />
                <Feature text="Select your preferred AI Model" />
                <Feature text="Upload unlimited files" />
                <Feature text="Visualize answers using DALL-E" />
              </ul>
            </div>

            <CheckoutButton
              interval={selectedInterval}
              disabled={!session?.user}
              onError={setError}
            >
              {!session?.user ? 'Sign in to upgrade' : 'Upgrade to Pro'}
            </CheckoutButton>
          </div>
        </div>

        {/* Maybe Later Button */}
        <button
          onClick={onClose}
          className="mt-4 text-gray-400 hover:text-gray-300 transition-colors text-sm w-full text-center"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-gray-300">
      <Check size={16} className="text-[#00B4D8]" />
      <span>{text}</span>
    </li>
  );
}