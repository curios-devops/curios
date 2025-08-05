import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message: string;
}

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] transition-colors duration-200">
      <Loader2 className="animate-spin text-[#0095FF] mb-4" size={28} />
      <p className="text-gray-700 dark:text-gray-400 text-sm transition-colors duration-200">{message}</p>
      <p className="text-xs text-gray-600 dark:text-gray-500 mt-2 transition-colors duration-200">This might take a few moments</p>
    </div>
  );
}