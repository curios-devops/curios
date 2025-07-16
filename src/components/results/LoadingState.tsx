import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message: string;
}

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-12 rounded-xl border border-gray-800"      
      style={{
        backgroundColor: 'var(--bg-theme-loading)'
      }}
    >
      <Loader2 className="animate-spin text-[#0095FF] mb-4" size={28} />
      <p className="dark:text-gray-400 text-gray-700 text-sm">{message}</p>
      <p className="text-xs dark:text-gray-500 text-gray-600 mt-2">This might take a few moments</p>
    </div>
  );
}