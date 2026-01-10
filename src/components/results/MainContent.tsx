import SourcesSection from '../SourcesSection';
import AnswerSection from '../AnswerSection';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import type { SearchState } from '../../types';

interface MainContentProps {
  searchState: SearchState;
  showAllSources: boolean;
  setShowAllSources: (show: boolean) => void;
  statusMessage: string;
  streamingContent?: string; // Progressive streaming content
}

export default function MainContent({ 
  searchState, 
  showAllSources, 
  setShowAllSources,
  statusMessage,
  streamingContent = ''
}: MainContentProps) {
  // Determine if we should show streaming content
  const hasStreamingContent = streamingContent.length > 0;
  const isStreamingInProgress = searchState.isLoading && hasStreamingContent;
  
  return (
    <div className="flex-1">
      {/* Show loading state only when no streaming content yet */}
      {searchState.isLoading && !hasStreamingContent && (
        <LoadingState message={statusMessage} />
      )}

      {searchState.error && (
        <ErrorState 
          message={searchState.error} 
          onRetry={() => window.location.reload()} 
        />
      )}

      {/* Show sources from final data if available, or show placeholder while streaming */}
      {(searchState.data || isStreamingInProgress) && (
        <>
          <SourcesSection
            sources={searchState.data?.sources || []}
            showAllSources={showAllSources}
            setShowAllSources={setShowAllSources}
          />
          
          {/* Show streaming content while loading, final answer when complete */}
          <AnswerSection 
            answer={searchState.data?.answer || streamingContent} 
            citations={searchState.data?.citations}
            sources={searchState.data?.sources}
            isStreaming={isStreamingInProgress}
          />
        </>
      )}
    </div>
  );
}