// Public movie share page at /movie/share/:id.
// Reads movie_projects (RLS allows public SELECT) and shows the final video + viral
// title/caption/thumbnail + the social share row.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Popcorn, Loader2 } from 'lucide-react';

import { MoviePersistenceService } from '../video/MoviePersistenceService.ts';
import type { ViralPackage } from '../types.ts';
import SocialShareRow from '../components/SocialShareRow.tsx';

interface SharedMovie {
  id: string;
  title: string;
  full_video_url?: string;
  thumbnail_url?: string;
  viral?: ViralPackage;
}

export default function MovieSharePage() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<SharedMovie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const persistence = new MoviePersistenceService();
    persistence
      .getMovie(id)
      .then((data) => setMovie(data as SharedMovie | null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--ui-bg-primary)' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
        <p>Movie not found.</p>
      </div>
    );
  }

  const viral = movie.viral;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--accent-primary)' }}>
          <Popcorn size={20} />
          <span className="text-sm font-medium">Curios Movie</span>
        </div>

        <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
          {movie.full_video_url ? (
            <video src={movie.full_video_url} controls autoPlay className="w-full h-full object-contain" />
          ) : movie.thumbnail_url ? (
            <img src={movie.thumbnail_url} alt={movie.title} className="w-full h-full object-contain" />
          ) : (
            <span className="text-white/60 text-sm">Video unavailable</span>
          )}
        </div>

        <h1 className="text-2xl font-semibold mt-5">{viral?.title || movie.title}</h1>
        {viral?.caption && <p className="mt-2" style={{ color: 'var(--ui-text-muted)' }}>{viral.caption}</p>}

        {viral?.hashtags && viral.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {viral.hashtags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-secondary)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6">
          <SocialShareRow
            shareUrl={typeof window !== 'undefined' ? window.location.href : ''}
            title={viral?.title || movie.title}
            caption={viral?.caption}
            videoUrl={movie.full_video_url}
            onShared={() => new MoviePersistenceService().incrementShareCount(movie.id).catch(() => undefined)}
          />
        </div>
      </div>
    </div>
  );
}
