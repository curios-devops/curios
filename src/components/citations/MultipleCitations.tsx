// Simplified version - Badge only, NO tooltip to avoid memory leaks
// TODO: Implement tooltip without memory leaks later

interface MultipleCitationsProps {
  citations: Array<{
    url: string;
    title: string;
    siteName: string;
    snippet?: string;
  }>;
  primarySiteName: string;
}

export default function MultipleCitations({ citations, primarySiteName }: MultipleCitationsProps) {
  // Deduplicate citations by URL
  const uniqueCitations = Array.from(
    new Map(citations.map(citation => [citation.url, citation])).values()
  );

  const additionalCount = uniqueCitations.length - 1;

  return (
    <span className="relative inline-block">
      {/* Badge only - no tooltip */}
      <span
        className="inline-flex items-center px-2 py-0.5 mx-0.5 text-white text-xs font-medium rounded-md"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        {uniqueCitations.length === 1 ? primarySiteName : `${primarySiteName} +${additionalCount}`}
      </span>

      {/* TOOLTIP COMMENTED OUT TO PREVENT MEMORY LEAK */}
      {/* TODO: Re-implement tooltip without useState/event handlers causing loops */}
    </span>
  );
}
