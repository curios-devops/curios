import React from 'react';
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
}

export default function MainContent({ 
  searchState, 
  showAllSources, 
  setShowAllSources,
  statusMessage 
}: MainContentProps) {
  return (
    <div className="flex-1">
      {searchState.isLoading && (
        <LoadingState message={statusMessage} />
      )}

      {searchState.error && (
        <ErrorState 
          message={searchState.error} 
          onRetry={() => window.location.reload()} 
        />
      )}

      {searchState.data && (
        <>
          <SourcesSection
            sources={searchState.data.sources}
            showAllSources={showAllSources}
            setShowAllSources={setShowAllSources}
          />
          <AnswerSection answer={searchState.data.answer} />
        </>
      )}
    </div>
  );
}