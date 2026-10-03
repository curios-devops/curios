// Home "Discover" card in Pamba's polaroid shape (shape only — the content is
// the same feed item as ContentCard): warm frame, inset media with the title
// overlaid, and a fixed-height caption row (mono label + round ↗).
//
// Height is fully determined by `shape` (media aspect) + the fixed frame and
// caption, never by text length — that is what keeps the mosaic columns level.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export type MosaicShape = 'vertical' | 'square' | 'landscape';

const ASPECT: Record<MosaicShape, string> = {
  vertical: '2 / 3',
  square: '1 / 1',
  landscape: '16 / 9',
};

interface Props {
  to: string;
  title: string;
  summary?: string | null;
  cover?: string | null;
  badge?: string;
  shape: MosaicShape;
  tilt: number; // degrees, small (Pamba uses ±1–1.75°)
}

// Feed summaries are raw markdown snippets ("**🧠 AI Solves…**") — show text only.
export function plainSnippet(text: string | null | undefined): string {
  return (text || '')
    .replace(/[*_`#>]+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function hueFor(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

export default function MosaicCard({ to, title, summary, cover, badge, shape, tilt }: Props) {
  const [broken, setBroken] = useState(false);
  const showImage = !!cover && !broken;
  const hue = hueFor(title);
  const snippet = plainSnippet(summary);

  return (
    <Link
      to={to}
      className="mosaic-card group block p-1.5 rounded-[17.6px] border transition-shadow duration-300"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: ASPECT[shape] }}>
        {showImage ? (
          <img
            src={cover as string}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 70% 35%))` }}
          >
            <Sparkles size={28} className="text-white/70" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
          <h3 className="text-white text-sm font-semibold leading-snug line-clamp-2">{title}</h3>
          {snippet && <p className="mt-0.5 text-white/75 text-xs line-clamp-1">{snippet}</p>}
        </div>
      </div>
      <div className="h-9 px-2 flex items-center justify-between">
        <span className="label-mono truncate" style={{ color: 'var(--accent-primary)' }}>{badge || 'Discover'}</span>
        <span
          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)' }}
          aria-hidden="true"
        >
          <ArrowUpRight size={14} />
        </span>
      </div>
    </Link>
  );
}
