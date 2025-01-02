import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, ArrowLeft } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-[#111111] border-b border-gray-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 text-[#007BFF] hover:text-[#0056b3] transition-colors">
          <Brain className="h-7 w-7" />
        </Link>
        <div className="flex items-center gap-2 text-gray-400">
          <ArrowLeft size={20} />
          <Link to="/" className="text-sm hover:text-white transition-colors">
            Legal
          </Link>
        </div>
      </div>
    </header>
  );
}