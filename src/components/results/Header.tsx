import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  query: string;
  onBack: () => void;
}

export default function Header({ query, onBack }: HeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <button 
        onClick={onBack}
        className="text-[#0095FF] hover:text-[#0080FF] transition-colors"
      >
        <ArrowLeft size={20} />
      </button>
      <h1 className="text-2xl font-medium text-white">{query}</h1>
    </div>
  );
}