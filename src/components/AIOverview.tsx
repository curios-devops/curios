import React, { useState } from 'react';
import { FileText, Share, Download, RotateCcw, Globe, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Notification from './Notification';
import type { Source } from '../types';

interface AIOverviewProps {
  answer: string;
  sources: Source[];
  query: string;
}

interface SourceTooltipProps {
  source: Source;
  children: React.ReactNode;
}

function SourceTooltip({ source, children }: SourceTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const domain = new URL(source.url).hostname.replace('www.', '');

  return (
    <div 
      className="relative inline"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 w-80 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-sm flex items-center justify-center">
                <Globe size={14} className="text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{domain}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {source.title}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">
                  {source.snippet?.slice(0, 120)}...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIOverview({ answer, sources, query }: AIOverviewProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const navigate = useNavigate();

  // Generate more contextual related questions based on the query
  const generateRelatedQuestions = (originalQuery: string) => {
    const baseQuestions = [
      `Latest developments in ${originalQuery}`,
      `How ${originalQuery} impacts current trends`,
      `Key challenges regarding ${originalQuery}`,
      `Expert opinions on ${originalQuery}`,
      `Future predictions for ${originalQuery}`
    ];
    return baseQuestions;
  };

  const relatedQuestions = generateRelatedQuestions(query);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showNotificationMessage('Link copied to clipboard');
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback: show the URL in an alert if clipboard fails
      alert(`Copy this link: ${window.location.href}`);
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
                onClick={handleShare}
                title="Copy link to clipboard"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#0095FF] dark:hover:text-[#0095FF] transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Share size={16} />
                Share
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#0095FF] dark:hover:text-[#0095FF] transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Download size={16} />
                Export
              </button>
              <button 
                onClick={handleRewrite}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#0095FF] dark:hover:text-[#0095FF] transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <RotateCcw size={16} />
                Rewrite
              </button>
            </div>
          </div>

          {/* Overview Content */}
          <div className="p-6">
            <div className="prose dark:prose-invert max-w-none">
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-base mb-6">
                {(() => {
                  // SUPER SIMPLE: Just display the answer with source numbers at the end
                  const sentences = answer.split(/(?<=[.!?])\s+/);
                  
                  return sentences.map((sentence, index) => {
                    const sourceIndex = index % sources.length;
                    const showSourceRef = index < sources.length && sources[sourceIndex];
                    
                    return (
                      <span key={index}>
                        {sentence}
                        {showSourceRef && (
                          <SourceTooltip source={sources[sourceIndex]}>
                            <sup className="text-[#0095FF] hover:underline cursor-pointer font-medium ml-1 text-xs">
                              {sourceIndex + 1}
                            </sup>
                          </SourceTooltip>
                        )}
                        {index < sentences.length - 1 ? ' ' : ''}
                      </span>
                    );
                  });
                })()}
              </div>
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
                    className="w-full flex items-center justify-between py-2.5 px-0 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
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
