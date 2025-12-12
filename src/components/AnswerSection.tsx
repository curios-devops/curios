import { useState } from 'react';
import { BookOpen, ThumbsUp, ThumbsDown, Copy, Loader2 } from 'lucide-react';
import CustomMarkdown from './CustomMarkdown';
import Notification from './Notification';
import type { CitationInfo } from '../commonApp/types';

export interface AnswerSectionProps {
  answer: string;
  citations?: CitationInfo[];
  isStreaming?: boolean; // Indicates if content is still streaming
}

export default function AnswerSection({ answer, citations = [], isStreaming = false }: AnswerSectionProps) {
  const [showNotification, setShowNotification] = useState(false);
  
  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    } catch (clipboardError: unknown) {
      console.error('Clipboard write failed:', clipboardError);
      
      // Fallback for clipboard API failure
      try {
        const textArea = document.createElement('textarea');
        textArea.value = answer;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 2000);
      } catch (clipboardError: unknown) {
        console.error('Clipboard fallback failed:', clipboardError);
      }
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-[#111111] rounded-xl p-6 border border-gray-200 dark:border-gray-800 transition-colors duration-200">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="text-[#0095FF]" size={22} />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white transition-colors duration-200">
            Answer
            {isStreaming && (
              <Loader2 className="inline-block ml-2 text-[#0095FF] animate-spin" size={18} />
            )}
          </h2>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <CustomMarkdown 
            className="text-gray-600 dark:text-gray-300 leading-relaxed text-base transition-colors duration-200"
            citations={citations}
          >
            {answer}
          </CustomMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 animate-pulse ml-1" style={{ backgroundColor: 'var(--accent-primary)' }} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-1">
          <button 
            type="button" 
            className="text-gray-400 p-1.5 rounded-lg transition-colors" 
            onClick={handleCopyClick} 
            disabled={isStreaming}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >
            <Copy size={16} />
          </button>
          <button 
            type="button" 
            className="text-gray-400 p-1.5 rounded-lg transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >
            <ThumbsUp size={16} />
          </button>
          <button 
            type="button" 
            className="text-gray-400 p-1.5 rounded-lg transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >
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