import React, { useState } from 'react';
import { Share2, Link2, Check } from 'lucide-react';

interface NotificationProps {
  isVisible: boolean;
}

function LinkCopiedNotification({ isVisible }: NotificationProps) {
  if (!isVisible) return null;
  
  return (
    <div className="absolute -top-10 right-0 bg-[#1a1a1a] text-[#007BFF] px-3 py-1.5 rounded-lg shadow-lg border border-gray-800 flex items-center gap-1.5 animate-fade-in whitespace-nowrap">
      <Link2 size={16} />
      <span className="text-xs">Link copied</span>
    </div>
  );
}

interface ShareMenuProps {
  url: string;
  title: string;
  text: string;
}

export default function ShareMenu({ url, title, text }: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);

  const handleShare = (platform: string) => {
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n\n${text}\n\n${url}`)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(text)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        setShowCopied(true);
        setShowCheckmark(true);
        setTimeout(() => setShowCheckmark(false), 1000);
        setTimeout(() => setShowCopied(false), 2000);
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=550,height=450');
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed top-2 right-4 z-50">
      <LinkCopiedNotification isVisible={showCopied} />
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#007BFF] hover:bg-[#0056b3] text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm"
        aria-label="Share menu"
      >
        <Share2 size={16} />
        <span>Share</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 bg-[#1a1a1a] rounded-lg border border-gray-800 shadow-xl p-4 w-[320px] animate-fade-in">
          <h2 className="text-base font-medium text-white mb-3">Share</h2>
          <div className="grid grid-cols-2 gap-2">
            {/* LinkedIn Button */}
            <button
              onClick={() => handleShare('linkedin')}
              className="flex items-center gap-2 px-3 py-2 bg-[#222222] hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="text-gray-300 text-sm">LinkedIn</span>
            </button>

            {/* Email Button */}
            <button
              onClick={() => handleShare('email')}
              className="flex items-center gap-2 px-3 py-2 bg-[#222222] hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/>
                <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/>
              </svg>
              <span className="text-gray-300 text-sm">Email</span>
            </button>

            {/* WhatsApp Button */}
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex items-center gap-2 px-3 py-2 bg-[#222222] hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
              </svg>
              <span className="text-gray-300 text-sm">WhatsApp</span>
            </button>

            {/* Facebook Button */}
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center gap-2 px-3 py-2 bg-[#222222] hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-gray-300 text-sm">Facebook</span>
            </button>

            {/* Twitter/X Button */}
            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center gap-2 px-3 py-2 bg-[#222222] hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="text-gray-300 text-sm">Twitter</span>
            </button>

            {/* Copy Link Button */}
            <button
              onClick={() => handleShare('copy')}
              className="flex items-center gap-2 px-3 py-2 bg-[#222222] hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              {showCheckmark ? (
                <Check size={20} className="text-green-500" />
              ) : (
                <Link2 size={20} className="text-white" />
              )}
              <span className="text-gray-300 text-sm">Copy Link</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}