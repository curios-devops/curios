import React, { useState } from 'react';
import { BookOpen, ThumbsUp, ThumbsDown } from 'lucide-react';
import Notification from './Notification';
import ShareMenu from './ShareMenu';
import type { ImageResult } from '../types';

interface AnswerSectionProps {
  answer: string;
  query?: string;
  images?: ImageResult[];
  isPro?: boolean;
}

export default function AnswerSection({ answer, query, images, isPro }: AnswerSectionProps) {
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const handleShare = async () => {
    try {
      // Use current URL as base to preserve host
      const urlWithParams = new URL(window.location.href);
      
      // Add the first valid image URL if available
      if (images && images.length > 0) {
        const firstImage = images[0];
        if (firstImage.url) {
          console.log("image url is: ", firstImage.url);
          urlWithParams.searchParams.set('img', firstImage.url);
        }
      }
      
      const finalUrl = urlWithParams.toString();
      const shareText = answer.slice(0, 100) + '...';
      const shareTitle = `${isPro ? '[PRO] ' : ''}CuriosAI Search: ${query || ''}`;

      // Try Web Share API first
      try {
        if (navigator.share) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: finalUrl
          });
          return;
        } 
      } catch (error) {
        // Ignore AbortError (user cancelled) and SecurityError (API not available)
        if (error.name !== 'AbortError' && error.name !== 'SecurityError') {
          console.warn('Share failed, falling back to clipboard:', error);
        }
      }

      // Fallback to clipboard
      try {
        // Create a temporary input element
        const tempInput = document.createElement('input');
        tempInput.value = finalUrl;
        document.body.appendChild(tempInput);
        
        // Select and copy
        tempInput.select();
        document.execCommand('copy');
        
        // Clean up
        document.body.removeChild(tempInput);
        
        // Show success UI
        setShowShareTooltip(true);
        setShowNotification(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      } catch (clipboardError) {
        console.error('Clipboard fallback failed:', clipboardError);
      }

    } catch (error) {
      console.error('Share operation failed:', error);
      // Silently fail - the UI already shows the tooltip for success/failure
    }
  };

  return (
    <>
      <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="text-[#0095FF]" size={22} />
          <h2 className="text-xl font-medium text-white">Answer</h2>
        </div>
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-base">
            {answer}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-1">
          <button className="text-gray-400 hover:text-[#0095FF] p-1.5 rounded-lg transition-colors">
            <ThumbsUp size={16} />
          </button>
          <button className="text-gray-400 hover:text-[#0095FF] p-1.5 rounded-lg transition-colors">
            <ThumbsDown size={16} />
          </button>
        </div>
      </div>
      <Notification
        message="Link copied"
        isVisible={showNotification}
        onHide={() => setShowNotification(false)}
      />
    </>
  );
}