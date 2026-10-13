// Source chip in an answer ("wikipedia" or "wikipedia +3"). Tap → a card with the source;
// with several, ‹ 1 / 3 › flips through them. The card is placed inside the viewport (never
// off-screen on mobile), with the arrow kept over the chip, and closes on an outside tap.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MultipleCitationsProps {
  citations: Array<{
    url: string;
    title: string;
    siteName: string;
    snippet?: string;
  }>;
  primarySiteName: string;
}

const MAX_WIDTH = 352;
const GUTTER = 16;

const faviconDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
};

export default function MultipleCitations({ citations, primarySiteName }: MultipleCitationsProps) {
  // Deduplicate citations by URL to avoid showing the same source multiple times
  const uniqueCitations = Array.from(
    new Map(citations.map(citation => [citation.url, citation])).values()
  );
  const many = uniqueCitations.length > 1;

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  // Card offset from the chip and arrow position, measured when it opens.
  const [place, setPlace] = useState<{ left: number; width: number; arrow: number }>({ left: 0, width: MAX_WIDTH, arrow: MAX_WIDTH / 2 });
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && containerRef.current) {
      const chip = containerRef.current.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const width = Math.min(MAX_WIDTH, vw - GUTTER * 2);
      const center = chip.left + chip.width / 2;
      const cardLeft = Math.min(Math.max(center - width / 2, GUTTER), vw - GUTTER - width);
      setPlace({ left: cardLeft - chip.left, width, arrow: center - cardLeft });
    }
    setOpen((v) => !v);
  };

  const step = (delta: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((i) => (i + delta + uniqueCitations.length) % uniqueCitations.length);
  };

  const citation = uniqueCitations[Math.min(index, uniqueCitations.length - 1)];
  const domain = citation ? faviconDomain(citation.url) : '';
  const card: CSSProperties = {
    left: place.left,
    width: place.width,
    backgroundColor: 'var(--ui-bg-elevated)',
    borderColor: 'var(--ui-border-default)',
    borderTopColor: 'var(--accent-primary)',
  };

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 text-xs font-medium rounded-md cursor-pointer hover:opacity-90 active:opacity-75"
        style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
      >
        {many ? `${primarySiteName} +${uniqueCitations.length - 1}` : primarySiteName}
      </button>

      {open && citation && (
        <span
          role="dialog"
          className="absolute z-50 bottom-full mb-2 block rounded-xl border border-t-2 shadow-lg text-left whitespace-normal"
          style={card}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow over the chip */}
          <span
            className="absolute -bottom-1 w-2 h-2 rotate-45 border-r border-b"
            style={{ left: place.arrow - 4, backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
          />

          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block px-4 pt-3 pb-3 no-underline"
            style={{ textDecoration: 'none' }}
            onClick={() => setOpen(false)}
          >
            <span className="flex items-center gap-2 mb-1.5">
              {domain && (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                  alt=""
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <span className="text-xs font-medium truncate text-gray-500 dark:text-gray-400">
                {citation.siteName || domain}
              </span>
            </span>
            <span
              className="text-sm font-medium leading-snug line-clamp-2 transition-colors text-gray-900 dark:text-white group-hover:text-[var(--accent-primary)]"
            >
              {citation.title}
            </span>
            {citation.snippet && (
              <span className="mt-1 text-xs leading-relaxed line-clamp-3 text-gray-500 dark:text-gray-400">
                {citation.snippet}
              </span>
            )}
          </a>

          {many && (
            <span className="flex items-center justify-between px-2 py-1.5 border-t" style={{ borderColor: 'var(--ui-border-default)' }}>
              <button type="button" onClick={step(-1)} className="p-1.5 rounded-full hover:bg-[var(--ui-bg-secondary)]" aria-label="Previous source">
                <ChevronLeft size={16} style={{ color: 'var(--ui-text-secondary)' }} />
              </button>
              <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--ui-text-secondary)' }}>
                {index + 1} / {uniqueCitations.length}
              </span>
              <button type="button" onClick={step(1)} className="p-1.5 rounded-full hover:bg-[var(--ui-bg-secondary)]" aria-label="Next source">
                <ChevronRight size={16} style={{ color: 'var(--ui-text-secondary)' }} />
              </button>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
