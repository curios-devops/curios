import { Share2 } from 'lucide-react';
import { useState } from 'react';

interface ShareMenuProps {
  url: string;
  title: string;
  text: string;
}

export default function ShareMenu({ url, title, text }: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[#0095FF] hover:bg-[#0056b3] text-white rounded-lg transition"
        type="button"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#23232a] border border-gray-700 rounded-lg shadow-lg p-2 z-50">
          <button
            onClick={handleShare}
            className="w-full text-left px-3 py-2 hover:bg-gray-800 rounded transition text-sm text-white"
            type="button"
          >
            Share Link
          </button>
        </div>
      )}
    </div>
  );
}