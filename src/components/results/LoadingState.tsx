import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message: string;
}

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-[#111111] rounded-xl border border-gray-800">
      <Loader2 className="animate-spin text-[#0095FF] mb-4" size={28} />
      <p className="text-gray-400 text-sm">{message}</p>
      <p className="text-xs text-gray-500 mt-2">This might take a few moments</p>
    </div>
  );
}