import { useCallback } from 'react';

interface UseLinkedInShareProps {
  baseUrl?: string;
}

interface ShareParams {
  query: string;
  snippet: string;
  image?: string;
}

export function useLinkedInShare({ baseUrl }: UseLinkedInShareProps = {}) {
  const defaultBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://curios.netlify.app';
  const url = baseUrl || defaultBaseUrl;

  const shareToLinkedIn = useCallback((params: ShareParams) => {
    const { query, snippet, image = '' } = params;
    
    // Validate parameters
    if (!query || !snippet) {
      console.error('LinkedIn share requires both query and snippet parameters');
      return;
    }

    // Create the share function URL with dynamic parameters
    const shareUrl = `${url}/.netlify/functions/share?query=${encodeURIComponent(query)}&snippet=${encodeURIComponent(snippet)}${image ? `&image=${encodeURIComponent(image)}` : ''}`;
    
    // LinkedIn sharing URL
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    
    // Open LinkedIn sharing dialog
    window.open(linkedInUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
  }, [url]);

  // Generate a shareable URL without opening LinkedIn (useful for copy/paste)
  const generateShareUrl = useCallback((params: ShareParams) => {
    const { query, snippet, image = '' } = params;
    return `${url}/.netlify/functions/share?query=${encodeURIComponent(query)}&snippet=${encodeURIComponent(snippet)}${image ? `&image=${encodeURIComponent(image)}` : ''}`;
  }, [url]);

  return {
    shareToLinkedIn,
    generateShareUrl
  };
}

// Example usage:
/*
import { useLinkedInShare } from '../hooks/useLinkedInShare';

function MyComponent() {
  const { shareToLinkedIn, generateShareUrl } = useLinkedInShare();

  const handleShare = () => {
    shareToLinkedIn({
      query: "How does AI impact business?",
      snippet: "AI is transforming business operations through automation and data analysis...",
      image: "https://example.com/image.jpg" // optional
    });
  };

  const shareUrl = generateShareUrl({
    query: "AI trends",
    snippet: "Latest developments in artificial intelligence..."
  });

  return (
    <button onClick={handleShare}>
      Share on LinkedIn
    </button>
  );
}
*/
