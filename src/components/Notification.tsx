import { useEffect } from 'react';
import { Check } from 'lucide-react';

interface NotificationProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
}

export default function Notification({ message, isVisible, onHide }: NotificationProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="bg-night-850 text-white rounded-lg shadow-lg border border-gray-800 px-4 py-3 flex items-center gap-2">
        <div className="rounded-full p-0.5" style={{ backgroundColor: 'var(--accent-primary)' }}>
          <Check size={12} className="text-[var(--ui-text-on-accent)]" />
        </div>
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}