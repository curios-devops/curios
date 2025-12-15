import { Plus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import CustomMarkdown from './CustomMarkdown';
import type { Source } from '../types';
import type { CitationInfo } from '../commonApp/types';

interface AIOverviewProps {
  answer: string;
  sources: Source[];
  query: string;
  followUpQuestions?: string[];
  citations?: CitationInfo[];
  isStreaming?: boolean;
  onSourcesClick?: () => void;
}

export default function AIOverview({ answer, sources, query, followUpQuestions, citations = [], isStreaming = false, onSourcesClick }: AIOverviewProps) {
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

  const handleRelatedQuestionClick = (question: string) => {
    // Navigate to search results with the new query
    const searchParams = new URLSearchParams();
    searchParams.set('q', question);
    navigate(`/search?${searchParams.toString()}`);
  };

  try {
    return (
      <>
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 transition-colors duration-200">
          {/* Header with AI Overview title and stacked source icons */}
          <div className="flex items-center justify-between p-4 sm:p-6 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--accent-primary)' }} />
              <h2 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white">AI Overview</h2>
            </div>
            
            {/* Stacked source favicons with +N count - clickable */}
            {sources.length > 0 && (
              <button
                onClick={onSourcesClick}
                title="View all sources"
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {/* Stacked favicons - show first 3 overlapping */}
                <div className="flex items-center">
                  {sources.slice(0, 3).map((source, index) => {
                    const domain = (() => {
                      try {
                        return new URL(source.url).hostname.replace('www.', '');
                      } catch {
                        return '';
                      }
                    })();
                    return (
                      <div 
                        key={index}
                        className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden"
                        style={{ marginLeft: index > 0 ? '-8px' : '0', zIndex: 3 - index }}
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                          alt=""
                          className="w-4 h-4"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* +N badge showing total sources */}
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  +{sources.length}
                </span>
              </button>
            )}
          </div>

          {/* Overview Content */}
          <div className="p-4 sm:p-6">
            <div className="prose dark:prose-invert max-w-none">
              <CustomMarkdown 
                className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base mb-6"
                citations={citations}
              >
                {answer}
              </CustomMarkdown>
              {/* Streaming cursor indicator */}
              {isStreaming && (
                <span className="inline-block w-2 h-4 animate-pulse ml-1 align-middle" style={{ backgroundColor: 'var(--accent-primary)' }}></span>
              )}
            </div>
          </div>

          {/* Related Section - hide when streaming */}
          {!isStreaming && (
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                <div className="w-2.5 h-2.5 grid grid-cols-2 gap-0.5">
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Related</h3>
            </div>
            
            <div className="space-y-0">
              {relatedQuestions.map((question, index) => (
                <div key={index}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between py-2.5 px-0 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer related-question-btn"
                    onClick={() => handleRelatedQuestionClick(question)}
                    onMouseEnter={(e) => {
                      const span = e.currentTarget.querySelector('.question-text') as HTMLElement;
                      const circle = e.currentTarget.querySelector('.plus-circle') as HTMLElement;
                      if (span) span.style.color = 'var(--accent-primary)';
                      if (circle) {
                        circle.style.borderColor = 'var(--accent-primary)';
                        circle.style.backgroundColor = 'var(--accent-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const span = e.currentTarget.querySelector('.question-text') as HTMLElement;
                      const circle = e.currentTarget.querySelector('.plus-circle') as HTMLElement;
                      if (span) span.style.color = '';
                      if (circle) {
                        circle.style.borderColor = '';
                        circle.style.backgroundColor = '';
                      }
                    }}
                  >
                    <span className="question-text text-sm text-gray-700 dark:text-gray-300 transition-colors leading-relaxed">
                      {question}
                    </span>
                    <div className="plus-circle flex-shrink-0 w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center transition-colors ml-3">
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
          )}
        </div>
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
