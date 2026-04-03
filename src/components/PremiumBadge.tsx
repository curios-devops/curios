import { useState } from 'react';
import { Crown } from 'lucide-react';

export default function PremiumBadge() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="fixed bottom-4 left-[calc(12rem+1rem)] z-50 transition-all duration-300"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative">
        <div
          className="flex items-center text-white p-2 rounded-lg shadow-lg transition-colors"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
          }}
        >
          <Crown size={16} />
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-[#1a1a1a] text-white text-sm px-3 py-1.5 rounded-lg shadow-lg border border-gray-800">
            Premium Subscription Active
          </div>
        )}
      </div>
    </div>
  );
}