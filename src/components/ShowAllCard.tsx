

interface ShowAllCardProps {
  totalSources: number;
  sources?: Array<{ url: string }>;
  onClick: () => void;
}

export default function ShowAllCard({ totalSources, sources, onClick }: ShowAllCardProps) {
  // Get unique domains from remaining sources (up to 3)
  const domains = sources
    ?.slice(0, 3)
    .map(source => {
      try {
        return new URL(source.url).hostname;
      } catch {
        return null;
      }
    })?.filter(Boolean) as string[] || [];

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#0095FF]/30 transition-all duration-300 group-hover:shadow-lg p-6 group"
    >
      <div className="flex flex-col h-full justify-center items-center text-center">
        {/* Preview Icons */}
        <div className="flex -space-x-2 mb-4">
          {domains.slice(0, 3).map((domain, i) => (
            <div 
              key={i}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-[#111111] group-hover:ring-[#0095FF]/20 transition-all"
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                alt=""
                className="w-5 h-5 opacity-75 group-hover:opacity-100"
                loading="lazy"
                onError={(e) => {
                  // Fallback to Globe icon if favicon fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.appendChild(
                    Object.assign(document.createElement('div'), {
                      className: 'w-5 h-5 text-gray-400',
                      innerHTML: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
                    })
                  );
                }}
              />
            </div>
          ))}
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h3 className="text-gray-900 dark:text-white font-medium group-hover:text-[#0095FF] transition-colors">
            Show {totalSources} More Sources
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Discover additional relevant results
          </p>
        </div>
      </div>
    </button>
  );
}