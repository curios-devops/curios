// Movie Mode results page (swipe-based).
// Layout: a single MAIN VIEWER renders the active swipe, with a lateral swipe RAIL
// (vertical on desktop, horizontal on mobile) and a "Frame n/N" indicator.
// Only the core swipe arrives with video; selecting any other swipe lazy-generates its
// video on demand (then caches it) — no video is rendered until the user activates it.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Popcorn, Loader2, Sparkles, Play } from 'lucide-react';

import { useSession } from '../../../hooks/useSession.ts';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { logger } from '../../../utils/logger.ts';
import { generateMovie, renderSwipeVideo, enhanceSwipeImage } from '../movieService.ts';
import { MoviePersistenceService } from '../video/MoviePersistenceService.ts';
import type { MovieExperience, MovieSwipe, MovieProgress } from '../types.ts';
import SocialShareRow from '../components/SocialShareRow.tsx';

export default function MovieResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useSession();
  const { requestProAccess, canUseProFeature } = useProCredits();

  const query = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);

  const [swipes, setSwipes] = useState<MovieSwipe[]>([]);
  const [experience, setExperience] = useState<MovieExperience | null>(null);
  const [progress, setProgress] = useState<MovieProgress>({ stage: 'enhancing', message: 'Starting...', progress: 0 });
  const [selectedSwipeId, setSelectedSwipeId] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [enhancingIds, setEnhancingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const hasStartedRef = useRef(false);
  const experienceRef = useRef<MovieExperience | null>(null);
  experienceRef.current = experience;

  const upsertSwipe = (swipe: MovieSwipe) =>
    setSwipes((prev) =>
      prev.some((s) => s.id === swipe.id)
        ? prev.map((s) => (s.id === swipe.id ? { ...swipe } : s))
        : [...prev, { ...swipe }].sort((a, b) => a.order - b.order),
    );

  // ── Kick off generation once per query ──────────────────────────────────────
  useEffect(() => {
    if (!query.trim() || hasStartedRef.current) return;
    hasStartedRef.current = true;

    generateMovie(query, {
      userId: session?.user?.id || 'curios-guest',
      // LTX generates each swipe's audio (generate_audio); a separate ElevenLabs
      // narration track would be unused and is redundant cost, so it's disabled.
      enableNarration: false,
      onProgress: (p) => {
        setProgress(p);
        if (p.swipes) setSwipes([...p.swipes].sort((a, b) => a.order - b.order));
      },
      onSwipeReady: (swipe) => {
        upsertSwipe(swipe);
        // Auto-select the core swipe as soon as it has an image.
        setSelectedSwipeId((cur) => cur ?? (swipe.isCore && swipe.imageUrl ? swipe.id : cur));
      },
    })
      .then((exp) => setExperience(exp))
      .catch((err) => {
        logger.error('[MovieResults] Generation failed', { error: err instanceof Error ? err.message : String(err) });
        setError(err instanceof Error ? err.message : 'Movie generation failed');
      });
  }, [query, session?.user?.id]);

  const isComplete = progress.stage === 'complete';
  const selectedSwipe = swipes.find((s) => s.id === selectedSwipeId) || swipes.find((s) => s.isCore) || swipes[0];
  const frameIndex = selectedSwipe ? swipes.findIndex((s) => s.id === selectedSwipe.id) + 1 : 0;

  // Lazy on-demand video generation when a user activates a swipe that has only an image.
  const triggerLazyVideo = async (swipe: MovieSwipe) => {
    if (swipe.videoUrl || generatingIds.has(swipe.id) || !swipe.imageUrl) return;
    setGeneratingIds((prev) => new Set(prev).add(swipe.id));
    upsertSwipe({ ...swipe, status: 'rendering' });

    const exp = experienceRef.current;
    const projectId = exp?.id && !exp.id.startsWith('local-') ? exp.id : undefined;
    const updated = await renderSwipeVideo({ ...swipe }, {
      userId: session?.user?.id,
      projectId,
      styleSeed: exp?.styleSeed,
    });

    upsertSwipe(updated);
    setGeneratingIds((prev) => {
      const next = new Set(prev);
      next.delete(swipe.id);
      return next;
    });
  };

  // Single gated entry point for rendering a swipe's video. The CORE swipe is
  // free; any non-core ("premium") swipe consumes 1 Pro Credit via the central
  // ProCreditsProvider, which opens the tier-appropriate modal when blocked.
  const requestRenderSwipe = async (swipe: MovieSwipe) => {
    if (swipe.videoUrl || generatingIds.has(swipe.id) || swipe.status === 'rendering' || !swipe.imageUrl) return;
    if (!swipe.isCore) {
      const allowed = await requestProAccess();
      if (!allowed) return; // modal shown by the provider; nothing rendered
    }
    void triggerLazyVideo(swipe);
  };

  const handleSelect = (swipe: MovieSwipe) => {
    setSelectedSwipeId(swipe.id); // viewing the image preview is always free
    void requestRenderSwipe(swipe);
  };

  // Enhance (off by default): regenerate this swipe's frame with the premium gpt-image-2
  // model, then re-render its video from the sharper frame. Premium quality → gated as Pro.
  const requestEnhance = async (swipe: MovieSwipe) => {
    if (!swipe.imageUrl || enhancingIds.has(swipe.id)) return;
    const allowed = await requestProAccess();
    if (!allowed) return; // modal shown by the provider

    setEnhancingIds((prev) => new Set(prev).add(swipe.id));
    upsertSwipe({ ...swipe, status: 'rendering' });

    const exp = experienceRef.current;
    const projectId = exp?.id && !exp.id.startsWith('local-') ? exp.id : undefined;
    const updated = await enhanceSwipeImage({ ...swipe }, {
      userId: session?.user?.id,
      projectId,
      styleSeed: exp?.styleSeed,
    });

    upsertSwipe(updated);
    setEnhancingIds((prev) => {
      const next = new Set(prev);
      next.delete(swipe.id);
      return next;
    });
  };

  const shareUrl = experience?.id && !experience.id.startsWith('local-')
    ? `${window.location.origin}/movie/share/${experience.id}`
    : window.location.href;

  const handleShared = () => {
    if (experience?.id && !experience.id.startsWith('local-')) {
      new MoviePersistenceService().incrementShareCount(experience.id).catch(() => undefined);
    }
  };

  const roleLabel = (s: MovieSwipe) => (s.isCore ? 'Core' : s.role.charAt(0).toUpperCase() + s.role.slice(1));
  const isEnhancing = selectedSwipe ? enhancingIds.has(selectedSwipe.id) : false;
  const isGenerating = selectedSwipe ? generatingIds.has(selectedSwipe.id) || (!isEnhancing && selectedSwipe.status === 'rendering') : false;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: 'var(--ui-border-subtle)' }}>
        <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            aria-label="Back"
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--ui-text-secondary)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <Popcorn size={20} style={{ color: 'var(--accent-primary)' }} />
          <h1 className="text-base font-medium truncate">{experience?.title || query || 'Movie'}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg p-4 text-sm" style={{ backgroundColor: 'var(--ui-bg-elevated)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Progress bar while generating */}
        {!isComplete && !error && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--ui-text-secondary)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>{progress.message}</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.progress}%`, backgroundColor: 'var(--accent-primary)' }}
              />
            </div>
          </div>
        )}

        {/* Main: viewer + lateral swipe rail */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main viewer (active swipe) */}
          <div className="flex-1 min-w-0">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              {selectedSwipe?.videoUrl ? (
                <video src={selectedSwipe.videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
              ) : selectedSwipe?.imageUrl ? (
                <>
                  <img src={selectedSwipe.imageUrl} alt={selectedSwipe.title} className="w-full h-full object-contain" />
                  {/* Image-only swipe → offer/await on-demand video */}
                  <button
                    onClick={() => selectedSwipe && requestRenderSwipe(selectedSwipe)}
                    disabled={isGenerating}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-colors"
                    style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#fff' }}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={30} className="animate-spin" />
                        <span className="text-sm">Generating video…</span>
                      </>
                    ) : (
                      <>
                        <span className="h-14 w-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-primary)' }}>
                          <Play size={26} className="ml-1" />
                        </span>
                        <span className="text-sm font-medium">Tap to generate this swipe</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/70">
                  <Loader2 size={28} className="animate-spin" />
                  <span className="text-sm">Creating your swipes…</span>
                </div>
              )}
            </div>

            {/* Frame indicator */}
            {swipes.length > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs font-medium" style={{ color: 'var(--ui-text-muted)' }}>
                  Frame {frameIndex}/{swipes.length}
                </div>
                <div className="flex gap-1">
                  {swipes.map((s) => (
                    <span
                      key={s.id}
                      className="h-1 rounded-full transition-all"
                      style={{
                        width: s.id === selectedSwipe?.id ? '20px' : '10px',
                        backgroundColor: s.id === selectedSwipe?.id ? 'var(--accent-primary)' : 'var(--ui-bg-elevated)',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedSwipe && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--accent-primary)' }}>
                    {roleLabel(selectedSwipe)}
                  </span>
                  <h2 className="text-sm font-medium">{selectedSwipe.title}</h2>
                  {selectedSwipe.imageUrl && (
                    <button
                      onClick={() => selectedSwipe && requestEnhance(selectedSwipe)}
                      disabled={isEnhancing}
                      title="Regenerate this swipe at higher quality (Pro)"
                      className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-60"
                      style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--accent-primary)' }}
                    >
                      {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {isEnhancing ? 'Enhancing…' : 'Enhance'}
                    </button>
                  )}
                </div>
                {selectedSwipe.narration && (
                  <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>{selectedSwipe.narration}</p>
                )}
              </div>
            )}

            {/* Viral packaging + social row (when complete) */}
            {isComplete && experience?.viral && (
              <div className="mt-6 rounded-xl p-5" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent-primary)' }}>
                  <Sparkles size={16} />
                  <span className="text-xs font-medium uppercase tracking-wide">Share your swipe</span>
                </div>
                <h3 className="text-lg font-semibold">{experience.viral.title}</h3>
                {experience.viral.caption && (
                  <p className="text-sm mt-1 mb-3" style={{ color: 'var(--ui-text-muted)' }}>{experience.viral.caption}</p>
                )}
                {experience.viral.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {experience.viral.hashtags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-secondary)' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <SocialShareRow
                  shareUrl={shareUrl}
                  title={experience.viral.title}
                  caption={experience.viral.caption}
                  videoUrl={selectedSwipe?.videoUrl || experience.coreVideoUrl}
                  onShared={handleShared}
                />
              </div>
            )}
          </div>

          {/* Lateral swipe rail (desktop) → horizontal on mobile */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
                Swipes {swipes.length > 0 && `(${swipes.length})`}
              </span>
              <span
                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
                title="Selecting any swipe outside Core consumes 1 Pro Credit."
              >
                Pro
              </span>
            </div>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[70vh] pb-2 lg:pb-0 scrollbar-hide">
              {swipes.map((swipe, idx) => {
                const isSel = swipe.id === selectedSwipe?.id;
                const rendering = generatingIds.has(swipe.id) || swipe.status === 'rendering';
                // Non-core swipes are locked once Pro Credits are exhausted (unless
                // already rendered, which is free to re-view).
                const locked = !swipe.isCore && !swipe.videoUrl && !canUseProFeature;
                return (
                  <button
                    key={swipe.id}
                    onClick={() => handleSelect(swipe)}
                    className="relative flex-shrink-0 w-40 lg:w-full aspect-video rounded-lg overflow-hidden border-2 transition-all"
                    style={{
                      borderColor: isSel ? 'var(--accent-primary)' : 'transparent',
                      opacity: locked ? 0.5 : 1,
                      cursor: locked ? 'not-allowed' : 'pointer',
                      filter: locked ? 'grayscale(100%)' : 'none',
                    }}
                  >
                    {swipe.imageUrl ? (
                      <img src={swipe.imageUrl} alt={swipe.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--ui-text-muted)' }} />
                      </div>
                    )}
                    <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                      {idx + 1}/{swipes.length}
                    </span>
                    <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: swipe.isCore ? 'var(--accent-primary)' : 'rgba(0,0,0,0.6)' }}>
                      {roleLabel(swipe)}
                    </span>
                    {rendering ? (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> render
                      </span>
                    ) : swipe.videoUrl ? (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/80 text-white">▶</span>
                    ) : swipe.status === 'error' ? (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-red-600/80 text-white">!</span>
                    ) : swipe.imageUrl ? (
                      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">preview</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
