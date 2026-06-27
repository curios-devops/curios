// Shared content card for Space / Library / Feed grids.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface ContentCardProps {
  to: string;
  title: string;
  summary?: string | null;
  cover?: string | null;
  badge?: string;
}

// Deterministic hue from the title so each branded placeholder looks distinct
// (and stable) rather than a flat grey box when an external image fails.
function hueFor(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

function Placeholder({ title }: { title: string }) {
  const hue = hueFor(title);
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 70% 35%))` }}
    >
      <Sparkles size={28} className="text-white/70" />
    </div>
  );
}

export default function ContentCard({ to, title, summary, cover, badge }: ContentCardProps) {
  // External cover URLs (news/SerpAPI) rot or block hotlinking — fall back to a
  // branded gradient so the feed never shows an empty box.
  const [broken, setBroken] = useState(false);
  const showImage = !!cover && !broken;

  return (
    <Link
      to={to}
      className="group flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all overflow-hidden bg-white dark:bg-[#0a0a0a]"
    >
      <div className="aspect-video bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {showImage ? (
          <img
            src={cover as string}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <Placeholder title={title} />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-1.5">
        {badge && (
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
            {badge}
          </span>
        )}
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors">
          {title}
        </h3>
        {summary && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{summary}</p>
        )}
      </div>
    </Link>
  );
}
