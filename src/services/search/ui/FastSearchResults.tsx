// FastSearch Results Page
// Displays fast search results with answer, media carousel, sources, and follow-ups


interface FastSearchResultsProps {
  query: string;
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  images: Array<{
    url: string;
    title: string;
    source: string;
  }>;
  videos: Array<{
    url: string;
    title: string;
    thumbnail: string;
  }>;
  followUps: string[];
  onFollowUpClick?: (question: string) => void;
}

export default function FastSearchResults({
  query,
  answer,
}: FastSearchResultsProps) {
  // TODO: Implement UI in Phase 4
  // Match current Search UI styling
  // Add horizontal carousel for images
  // Add horizontal carousel for sources
  // Display follow-ups as clickable questions

  return (
    <div className="fast-search-results">
      <h1>{query}</h1>
      <div className="answer-section">
        <h2>AI Overview</h2>
        <p>{answer}</p>
      </div>

      {/* TODO: Media carousel */}

      {/* TODO: Sources carousel */}

      {/* TODO: Follow-ups section */}

      <p style={{ color: 'var(--ui-text-muted)', padding: '20px' }}>
        FastSearch UI - Coming soon in Phase 4
      </p>
    </div>
  );
}
