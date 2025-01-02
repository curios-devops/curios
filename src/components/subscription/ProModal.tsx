import React, { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { useStripe } from '../../hooks/useStripe';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProModal({ isOpen, onClose }: ProModalProps) {
  const { createCheckoutSession, loading, error } = useStripe();
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    try {
      const url = await createCheckoutSession(selectedInterval);
      if (url) window.location.href = url;
    } catch (error) {
      // Error is handled by useStripe hook
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] w-full max-w-[800px] p-8 rounded-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-medium text-white mb-2">
            Upgrade to Pro
          </h2>
          <p className="text-gray-400">
            Unlock advanced features and unlimited searches
          </p>
          {error && (
            <p className="mt-2 text-red-500 text-sm">{error}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Plan */}
          <div className="bg-[#222222] p-6 rounded-xl border border-gray-800">
            <div className="text-center mb-6">
              <h3 className="text-xl font-medium text-white mb-2">Monthly</h3>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-white">$10</span>
                <span className="text-gray-400">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-6">
              <Feature text="Unlimited Pro searches" />
              <Feature text="Advanced AI models" />
              <Feature text="Priority support" />
              <Feature text="No ads" />
            </ul>

            <button
              onClick={() => {
                setSelectedInterval('month');
                handleSubscribe();
              }}
              disabled={loading}
              className="w-full bg-[#007BFF] text-white py-3 rounded-lg hover:bg-[#0056b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading && selectedInterval === 'month' ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : null}
              Subscribe Monthly
            </button>
          </div>

          {/* Yearly Plan */}
          <div className="bg-[#222222] p-6 rounded-xl border border-gray-800">
            <div className="text-center mb-6">
              <h3 className="text-xl font-medium text-white mb-2">Yearly</h3>
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-bold text-white">$100</span>
                <span className="text-gray-400">/year</span>
              </div>
              <span className="text-[#00B4D8] text-sm">Save 20%</span>
            </div>

            <ul className="space-y-4 mb-6">
              <Feature text="Everything in Monthly" />
              <Feature text="2 months free" />
              <Feature text="Early access to new features" />
              <Feature text="Higher usage limits" />
            </ul>

            <button
              onClick={() => {
                setSelectedInterval('year');
                handleSubscribe();
              }}
              disabled={loading}
              className="w-full bg-[#007BFF] text-white py-3 rounded-lg hover:bg-[#0056b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading && selectedInterval === 'year' ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : null}
              Subscribe Yearly
            </button>
          </div>
        </div>

        {/* Maybe Later Button */}
        <button
          onClick={onClose}
          className="mt-6 text-gray-400 hover:text-gray-300 transition-colors text-sm w-full text-center"
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