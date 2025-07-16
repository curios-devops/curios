import React from 'react';
import { useState } from 'react';
import { BookOpen, ThumbsUp, ThumbsDown, Copy } from 'lucide-react';
import Notification from './Notification';

interface AnswerSectionProps {
  answer: string;
}

export default function AnswerSection({ answer }: AnswerSectionProps) {
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
          <h2 className="text-xl font-medium text-gray-900 dark:text-white transition-colors duration-200">Answer</h2>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-base transition-colors duration-200">
            {answer}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-1">
          <button className="text-gray-400 hover:text-[#0095FF] p-1.5 rounded-lg transition-colors" onClick={handleCopyClick}>
            <Copy size={16} />
          </button>
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