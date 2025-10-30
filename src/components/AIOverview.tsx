import { useState } from 'react';
import { FileText, Share, Download, RotateCcw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import CustomMarkdown from './CustomMarkdown';
import Notification from './Notification';
import type { Source } from '../types';
import type { CitationInfo } from '../commonApp/types';

interface AIOverviewProps {
  answer: string;
  sources: Source[];
  query: string;
  followUpQuestions?: string[];
  citations?: CitationInfo[];
}

export default function AIOverview({ answer, sources, query, followUpQuestions, citations = [] }: AIOverviewProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const navigate = useNavigate();

  // Generate fallback related questions based on the query (used as fallback)
  const generateFallbackQuestions = (originalQuery: string) => {
    const baseQuestions = [
      `Latest developments in ${originalQuery}`,
      `How ${originalQuery} impacts current trends`,
      `Key challenges regarding ${originalQuery}`,
      `Expert opinions on ${originalQuery}`,
      `Future predictions for ${originalQuery}`
    ];
    return baseQuestions;
  };

  // Use WriterAgent-generated follow-up questions if available, otherwise use fallback
  const relatedQuestions = followUpQuestions && followUpQuestions.length > 0 
    ? followUpQuestions 
    : generateFallbackQuestions(query);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(globalThis.location.href);
      showNotificationMessage('Link copied to clipboard');
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback: show the URL in an alert if clipboard fails
      alert(`Copy this link: ${globalThis.location.href}`);
    }
  };

  const handleExport = async () => {
    try {
      const exportText = `AI Overview: ${query}\n\n${answer}\n\nSources:\n${sources.map((source, index) => `${index + 1}. ${source.title} - ${source.url}`).join('\n')}`;
      await navigator.clipboard.writeText(exportText);
      showNotificationMessage('Overview exported to clipboard');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleRewrite = () => {
    // In a real implementation, this would trigger a rewrite of the answer
    showNotificationMessage('Rewriting answer...');
  };

  const handleRelatedQuestionClick = (question: string) => {
    // Navigate to search results with the new query
    const searchParams = new URLSearchParams();
    searchParams.set('q', question);
    navigate(`/search?${searchParams.toString()}`);
  };

  const showNotificationMessage = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  try {
    return (
      <>
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 transition-colors duration-200">
          {/* Header with Overview title and action buttons */}
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0095FF] rounded-lg flex items-center justify-center">
                <FileText className="text-white" size={18} />
              </div>
              <h2 className="text-xl font-medium text-gray-900 dark:text-white">Overview</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={handleShare}
                title="Copy link to clipboard"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#0095FF] dark:hover:text-[#0095FF] transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <Share size={16} />
                Share
              </button>
              <button 
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#0095FF] dark:hover:text-[#0095FF] transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <Download size={16} />
                Export
              </button>
              <button 
                type="button"
                onClick={handleRewrite}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#0095FF] dark:hover:text-[#0095FF] transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <RotateCcw size={16} />
                Rewrite
              </button>
            </div>
          </div>

          {/* Overview Content */}
          <div className="p-6">
            <div className="prose dark:prose-invert max-w-none">
              <CustomMarkdown 
                className="text-gray-700 dark:text-gray-300 leading-relaxed text-base mb-6"
                citations={citations}
              >
                {answer}
              </CustomMarkdown>
            </div>
          </div>

          {/* Related Section */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                <div className="w-2.5 h-2.5 grid grid-cols-2 gap-0.5">
                  <div className="bg-[#0095FF] rounded-sm"></div>
                  <div className="bg-[#0095FF] rounded-sm"></div>
                  <div className="bg-[#0095FF] rounded-sm"></div>
                  <div className="bg-[#0095FF] rounded-sm"></div>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Related</h3>
            </div>
            
            <div className="space-y-0">
              {relatedQuestions.map((question, index) => (
                <div key={index}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between py-2.5 px-0 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                    onClick={() => handleRelatedQuestionClick(question)}
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-[#0095FF] transition-colors leading-relaxed">
                      {question}
                    </span>
                    <div className="flex-shrink-0 w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center group-hover:border-[#0095FF] group-hover:bg-[#0095FF] transition-colors ml-3">
                      <Plus size={10} className="text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                  </button>
                  {index < relatedQuestions.length - 1 && (
                    <div className="border-b border-gray-200 dark:border-gray-800"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Notification
          message={notificationMessage}
          isVisible={showNotification}
          onHide={() => setShowNotification(false)}
        />
      </>
    );
  } catch (error) {
    console.error('AIOverview: Error in JSX render:', error);
    return (
      <div className="p-4 border border-red-300 rounded-lg bg-red-50">
        <p className="text-red-700">Error rendering AI Overview: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}
