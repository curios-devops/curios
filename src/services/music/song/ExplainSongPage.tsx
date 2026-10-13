// /song-explain?topic=…&q=… — "A song that explains it" (Search → Explore further): the song
// studio with no real song behind it; Luna writes the lyrics from the search's explanation.
// The explanation comes from the cached search (no new calls); opened from a link, the
// question alone is the brief.
import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import SongStudio from './SongStudio.tsx';
import type { SongTopic } from './songService.ts';
import { getCached } from '../../search/searchCache.ts';
import { useGoBack } from '../../../hooks/useGoBack.ts';

// Plain text for the model: markdown links → their text, citation chips and markup dropped.
const plain = (md: string) => md
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/\[[^\]]*\]/g, '')
  .replace(/[#*_>`]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export default function ExplainSongPage() {
  const { search } = useLocation();
  const goBack = useGoBack();
  const params = new URLSearchParams(search);
  const topic = params.get('topic') ?? '';
  const q = params.get('q') ?? '';

  const source = useMemo<SongTopic>(() => {
    const answer = getCached<{ answer: string }>(`${q}|false|false`)?.value.answer
      ?? getCached<{ answer: string }>(`${q}|true|false`)?.value.answer;
    return { kind: 'topic', title: topic || q, about: answer ? plain(answer) : q };
  }, [topic, q]);

  if (!topic && !q) return <Navigate to="/" replace />;
  return <SongStudio info={source} onClose={goBack} />;
}
