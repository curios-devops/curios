import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="bg-red-500/10 text-red-500 p-6 rounded-xl border border-red-500/20">
      <div className="flex items-center gap-3 mb-4">
        <AlertCircle size={18} />
        <p className="text-sm">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-500 px-4 py-2 rounded-lg transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}