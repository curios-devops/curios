import { useState, useEffect } from 'react';
import { Share2, Link2, Check } from 'lucide-react';
import Notification from './Notification';
import { updateMetaTags } from '../utils/metaTags';

interface ShareMenuProps {
  url: string;
  title: string;
  text: string;
  query?: string;
  images?: Array<{ url: string; alt?: string }>;
}

type SharePlatform = 'linkedin' | 'email' | 'whatsapp' | 'facebook' | 'twitter' | 'copy';

export default function ShareMenu({ url, title, text, query, images }: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  // SUPER EXPLICIT DEBUG - This should ALWAYS show
  console.log('🚨🚨🚨 SHAREMENU COMPONENT IS RENDERING 🚨🚨🚨');
  console.log('Props received:', { url, title, text, query, images });
  console.log('Current timestamp:', new Date().toISOString());
  console.log('🚨🚨🚨 END SHAREMENU DEBUG 🚨🚨🚨');

  // Debug when isOpen changes
  useEffect(() => {
    console.log('📱 ShareMenu isOpen changed to:', isOpen);
  }, [isOpen]);

  const handleShare = async (platform: SharePlatform) => {
    try {
      switch (platform) {
        case 'linkedin':
          console.log('=== LinkedIn Share Debug START ===');
          console.log('Raw props received:');
          console.log('- url:', url);
          console.log('- title:', title);
          console.log('- text:', text);
          console.log('- query:', query);
          console.log('- images:', images);
          
          // Update meta tags before sharing for better social preview
          const imageUrl = images && images.length > 0 ? images[0].url : '';
          updateMetaTags({
            title: query ? `CuriosAI Search: ${query}` : title,
            description: text || 'Discover comprehensive search results powered by AI',
            image: imageUrl,
            url: url
          });
          
          // Clean the URL - remove any fragments
          const cleanUrl = url.split('#')[0];
          console.log('- cleanUrl:', cleanUrl);
          
          // Improve LinkedIn title and text
          const linkedInTitle = query ? `${query}` : title.replace(/CuriosAI Search: |[\[\]]/g, '').trim() || 'CuriosAI Search Results';
          const shareableText = text || 'Discover comprehensive search results powered by AI';
          
          // Truncate text for LinkedIn (max ~200 chars for summary)
          const truncatedText = shareableText.length > 200 ? 
            shareableText.substring(0, 197) + '...' : shareableText;
          
          console.log('After processing:');
          console.log('- linkedInTitle:', linkedInTitle);
          console.log('- truncatedText:', truncatedText);
          console.log('- cleanUrl:', cleanUrl);
          console.log('- imageUrl:', imageUrl);
          
          // Enhanced LinkedIn sharing parameters
          const linkedInParams = new URLSearchParams({
            mini: 'true',
            url: cleanUrl,
            title: linkedInTitle,
            summary: `${truncatedText} | Powered by CuriosAI Web Search`,
            source: 'CuriosAI'
          });
          
          const linkedInUrl = `https://www.linkedin.com/shareArticle?${linkedInParams.toString()}`;
          
          console.log('=== Final LinkedIn URL ===');
          console.log(linkedInUrl);
          console.log('URL length:', linkedInUrl.length);
          console.log('=== LinkedIn Share Debug END ===');
          
          window.open(linkedInUrl, '_blank', 'width=600,height=500');
          setIsOpen(false);
          break;
        case 'email':
          window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}%0A%0A${encodeURIComponent(url)}`, '_blank');
          break;
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(title)}%0A${encodeURIComponent(url)}`, '_blank');
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
          break;
        case 'copy':
          await navigator.clipboard.writeText(url);
          setShowCheckmark(true);
          setShowNotification(true);
          setTimeout(() => {
            setShowCheckmark(false);
            setShowNotification(false);
          }, 2000);
          break;
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
      }
      console.error('Share operation failed:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          console.log('📤 Share button clicked, current isOpen:', isOpen);
          setIsOpen(!isOpen);
        }}
        className="bg-[#007BFF] hover:bg-[#0056b3] text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm"
        aria-label="Share menu"

      >
        <Share2 size={16} />
        <span>Share</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-800 shadow-xl p-4 w-[320px] animate-fade-in transition-colors duration-200">
          <h2 className="text-base font-medium text-gray-900 dark:text-white mb-3 transition-colors duration-200">Share</h2>
          
          {/* Development notice for localhost URLs */}
          {url.includes('localhost') && (
            <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Development Mode:</strong> Link previews won't show on social media from localhost URLs. 
                The link and content will still share correctly.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            {/* LinkedIn Button */}
            <button
              onClick={() => {
                console.log('🔥 LinkedIn button clicked at:', new Date().toISOString());
                console.log('🔥 Event triggered, calling handleShare');
                handleShare('linkedin');
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#222222] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors duration-200">LinkedIn</span>
            </button>

            {/* Email Button */}
            <button
              onClick={() => handleShare('email')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#222222] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/>
                <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors duration-200">Email</span>
            </button>

            {/* WhatsApp Button */}
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#222222] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors duration-200">WhatsApp</span>
            </button>

            {/* Facebook Button */}
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#222222] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors duration-200">Facebook</span>
            </button>

            {/* Twitter/X Button */}
            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#222222] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors duration-200">Twitter</span>
            </button>

            {/* Copy Link Button */}
            <button
              onClick={() => handleShare('copy')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#222222] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-left"
            >
              {showCheckmark ? (
                <Check size={20} className="text-green-500" />
              ) : (
                <Link2 size={20} className="text-gray-900 dark:text-white transition-colors duration-200" />
              )}
              <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors duration-200">Copy Link</span>
            </button>
          </div>
        </div>
      )}
      
      <Notification
        message="Link copied"
        isVisible={showNotification}
        onHide={() => setShowNotification(false)}
      />
    </div>
  );
}