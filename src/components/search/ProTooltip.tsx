import React from 'react';
import { Sparkles } from 'lucide-react';

interface ProTooltipProps {
  onSignIn: () => void;
}

export default function ProTooltip({ onSignIn }: ProTooltipProps) {
  return (
    <div className="absolute right-0 top-full mt-2 bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-800 w-80 z-50">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-[#007BFF]" size={18} />
        <h3 className="text-white font-medium">Pro Search</h3>
      </div>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Pro Search considers twice as many sources when searching for your answer.
        </p>
        
        <button
          onClick={onSignIn}
          className="w-full bg-[#007BFF] text-white py-2.5 rounded-lg hover:bg-[#0056b3] transition-colors text-sm font-medium"
        >
          Sign in for Pro Searches
        </button>
      </div>
    </div>
  );
}