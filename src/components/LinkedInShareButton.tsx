import { Share2 } from 'lucide-react';

interface LinkedInShareButtonProps {
  query: string;
  snippet: string;
  image?: string;
  className?: string;
  variant?: 'default' | 'minimal' | 'icon';
}

export function LinkedInShareButton({ 
  query, 
  snippet, 
  image = '', 
  className = '',
  variant = 'default'
}: LinkedInShareButtonProps) {
  
  const handleLinkedInShare = () => {
    // Create the share function URL with dynamic parameters
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/.netlify/functions/share?query=${encodeURIComponent(query)}&snippet=${encodeURIComponent(snippet)}${image ? `&image=${encodeURIComponent(image)}` : ''}`;
    
    // LinkedIn sharing URL
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    
    // Open LinkedIn sharing dialog
    window.open(linkedInUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
  };

  // Render different variants
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleLinkedInShare}
        className={`text-blue-600 hover:text-blue-700 text-sm font-medium ${className}`}
        title="Share on LinkedIn"
      >
        Share on LinkedIn
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleLinkedInShare}
        className={`p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${className}`}
        title="Share on LinkedIn"
      >
        <Share2 size={18} />
      </button>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleLinkedInShare}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
      Share on LinkedIn
    </button>
  );
}

// Example usage component for testing
export function LinkedInShareExample() {
  const exampleQuery = "How does AI impact modern business?";
  const exampleSnippet = "Artificial intelligence is transforming business operations through automation, data analysis, and customer experience improvements. Companies leveraging AI see significant efficiency gains and competitive advantages.";

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold text-gray-900">LinkedIn Share Button Examples</h3>
      
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600 mb-2">Default button:</p>
          <LinkedInShareButton 
            query={exampleQuery}
            snippet={exampleSnippet}
          />
        </div>
        
        <div>
          <p className="text-sm text-gray-600 mb-2">Minimal variant:</p>
          <LinkedInShareButton 
            query={exampleQuery}
            snippet={exampleSnippet}
            variant="minimal"
          />
        </div>
        
        <div>
          <p className="text-sm text-gray-600 mb-2">Icon variant:</p>
          <LinkedInShareButton 
            query={exampleQuery}
            snippet={exampleSnippet}
            variant="icon"
          />
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-4">
        <strong>Query:</strong> {exampleQuery}<br />
        <strong>Snippet:</strong> {exampleSnippet.slice(0, 100)}...
      </div>
    </div>
  );
}
