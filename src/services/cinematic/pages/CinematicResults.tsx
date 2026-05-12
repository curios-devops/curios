import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, RefreshCw, Link2, Film, FileText, Clock, ArrowLeft, Sparkles } from 'lucide-react';
import LightMarkdown from '../../../components/LightMarkdown';
import { useSession } from '../../../hooks/useSession.ts';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { formatTimeAgo } from '../../../utils/time';
import ShareMenu from '../../../components/ShareMenu';
import { SequentialVideoPlayer } from '../../../components/cinematic/SequentialVideoPlayer';
import {
  CinematicExperience,
  CinematicProgress,
  CinematicScene,
  finalizeTemporaryScene,
  generateCompleteCinematicVideo,
} from '../cinematicService.ts';

export default function CinematicResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useSession();
  const { t } = useTranslation();
  const query = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);

  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [activeTab, setActiveTab] = useState('video');

  const [experience, setExperience] = useState<CinematicExperience | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CinematicProgress | null>(null);
  const [sceneState, setSceneState] = useState<CinematicScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [hoveredSceneId, setHoveredSceneId] = useState<string | null>(null);
  const [narrativePreview, setNarrativePreview] = useState('');
  const [narrativePhase, setNarrativePhase] = useState<'draft' | 'final'>('draft');
  const [sendLinkCopied, setSendLinkCopied] = useState(false);

  const isFinalizingScenesRef = useRef(false);
  const latestScenesRef = useRef<CinematicScene[]>([]);
  const lastFinalizeAttemptRef = useRef<Map<string, number>>(new Map());

  const aspectRatio = useMemo<'16:9' | '1:1'>(() => {
    if (typeof window === 'undefined') return '16:9';
    return window.matchMedia('(min-width: 768px)').matches ? '16:9' : '1:1';
  }, []);

  const displayScenes = useMemo<CinematicScene[]>(() => {
    const baseScenes = experience?.scenes?.length ? experience.scenes : sceneState;
    if (!baseScenes.length) return [];
    if (!sceneState.length) return baseScenes;

    const liveById = new Map(sceneState.map((scene) => [scene.id, scene]));

    return baseScenes.map((scene) => {
      const live = liveById.get(scene.id);
      if (!live) return scene;

      return {
        ...scene,
        ...live,
        id: scene.id,
        title: scene.title || live.title,
        narration: scene.narration || live.narration,
        visualPrompt: scene.visualPrompt || live.visualPrompt,
        durationSeconds: scene.durationSeconds || live.durationSeconds,
      };
    });
  }, [experience?.scenes, sceneState]);

  const selectedScene = useMemo(() => {
    const source = displayScenes;
    if (!source.length) return null;

    const firstReadyPreviewOrFinal = source.find(
      (scene) =>
        scene.status === 'ready' &&
        (scene.sceneStage === 'preview' || scene.sceneStage === 'final') &&
        (scene.enhancedVideoUrl || scene.videoUrl)
    );
    const firstReadyAny = source.find((scene) => scene.status === 'ready' && (scene.enhancedVideoUrl || scene.videoUrl));

    if (selectedSceneId) {
      const selected = source.find((scene) => scene.id === selectedSceneId);
      if (selected) {
        // Return scene with enhanced video URL if available
        return {
          ...selected,
          videoUrl: selected.enhancedVideoUrl || selected.videoUrl,
        };
      }
      return firstReadyPreviewOrFinal || firstReadyAny || selected || source[0];
    }

    return firstReadyPreviewOrFinal || firstReadyAny || source[0];
  }, [displayScenes, selectedSceneId]);

  const load = async () => {
    if (!query.trim()) {
      setError('Please enter a question to generate a cinematic answer.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setExperience(null);
    setSceneState([]);
    setSelectedSceneId(null);
    setNarrativePreview('');
    setNarrativePhase('draft');

    try {
      const result = await generateCompleteCinematicVideo(query, {
        aspectRatio,
        userId: session?.user?.id || 'curios-guest',
        enableNarration: true,
        enableTextOverlay: true,
        onProgress: (progressEvent) => {
          setProgress(progressEvent);
          if (progressEvent.scenes) {
            setSceneState(progressEvent.scenes);
          }
        },
        onNarrativeChunk: (_chunk, fullText, _isComplete, phase) => {
          setNarrativePreview(fullText);
          setNarrativePhase(phase);
        },
      });

      const mergedScenes = (result.scenes || []).map((scene, index) => {
        const progressive = latestScenesRef.current[index];
        if (!progressive || progressive.status !== 'ready') {
          return scene;
        }

        return {
          ...scene,
          ...progressive,
          id: scene.id,
          title: scene.title || progressive.title,
          narration: scene.narration || progressive.narration,
          visualPrompt: scene.visualPrompt || progressive.visualPrompt,
          durationSeconds: scene.durationSeconds || progressive.durationSeconds,
          videoUrl: progressive.videoUrl || scene.videoUrl,
          enhancedVideoUrl: progressive.enhancedVideoUrl || scene.enhancedVideoUrl,
          mixedVideoUrl: progressive.mixedVideoUrl || scene.mixedVideoUrl,
          status: 'ready' as const,
        };
      });

      setExperience({
        ...result,
        scenes: mergedScenes,
      });
      setSceneState(mergedScenes);
      setSelectedSceneId(null);
    } catch (generationError) {
      console.error('[CinematicResults] Generation error:', generationError);
      const errorMessage = generationError instanceof Error
        ? generationError.message
        : 'Unknown error';

      // Provide specific error messages for common issues
      if (errorMessage.includes('546') || errorMessage.includes('timeout') || errorMessage.includes('memory')) {
        setError('Video processing is taking longer than expected. Some scenes may be available - please check below. You can try refreshing or regenerating.');
      } else if (errorMessage.includes('Edge function failed')) {
        setError('Video service encountered an issue. Some scenes may still be available. Try refreshing the page.');
      } else {
        setError('We hit a temporary issue while preparing your cinematic answer. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Show immediate feedback by setting a placeholder
    setNarrativePreview('');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, aspectRatio]);

  useEffect(() => {
    latestScenesRef.current = displayScenes;
  }, [displayScenes]);

  useEffect(() => {
    const FINALIZATION_RETRY_INTERVAL_MS = 20000;
    const FINALIZATION_SCENE_COOLDOWN_MS = 60000;
    let isDisposed = false;

    const attemptFinalization = async () => {
      if (isFinalizingScenesRef.current || isDisposed) return;

      const sourceScenes = latestScenesRef.current;
      const now = Date.now();
      const pendingScenes = sourceScenes.filter(
        (scene) =>
          scene.status === 'ready' &&
          !!scene.operationName &&
          scene.error?.includes('Temporary clip ready while we finish processing.') &&
          now - (lastFinalizeAttemptRef.current.get(scene.id) || 0) >= FINALIZATION_SCENE_COOLDOWN_MS
      );

      if (!pendingScenes.length) return;

      isFinalizingScenesRef.current = true;
      try {
        const userId = session?.user?.id || 'curios-guest';
        pendingScenes.forEach((scene) => {
          lastFinalizeAttemptRef.current.set(scene.id, now);
        });
        const finalizedScenes = await Promise.all(
          pendingScenes.map((scene) => finalizeTemporaryScene(scene, userId))
        );

        if (isDisposed) return;

        const updatedById = new Map(finalizedScenes.map((scene) => [scene.id, scene]));
        const mergeScenes = (scenes: CinematicScene[]) =>
          scenes.map((scene) => {
            const updated = updatedById.get(scene.id);
            if (!updated) return scene;

            return {
              ...scene,
              ...updated,
              title: scene.title || updated.title || scene.title,
              narration: scene.narration || updated.narration || scene.narration,
              visualPrompt: scene.visualPrompt || updated.visualPrompt || scene.visualPrompt,
            };
          });

        setSceneState((previous) => mergeScenes(previous));
        setExperience((previous) =>
          previous
            ? {
                ...previous,
                scenes: mergeScenes(previous.scenes),
              }
            : previous
        );
      } finally {
        isFinalizingScenesRef.current = false;
      }
    };

    void attemptFinalization();
    const interval = window.setInterval(() => {
      void attemptFinalization();
    }, FINALIZATION_RETRY_INTERVAL_MS);

    return () => {
      isDisposed = true;
      window.clearInterval(interval);
    };
  }, [session?.user?.id]);

  // Update time ago
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [searchStartTime]);

  const handleDownload = async () => {
    const safeTitle = (experience?.title || query || 'cinematic-video')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cinematic-video';

    const readyScenes = displayScenes.filter(
      s => s.status === 'ready' && (s.enhancedVideoUrl || s.videoUrl)
    );

    if (readyScenes.length === 0) return;

    // If only one scene, download it directly
    if (readyScenes.length === 1) {
      const videoUrl = readyScenes[0].enhancedVideoUrl || readyScenes[0].videoUrl!;
      try {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = `${safeTitle}.mp4`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(blobUrl);
      } catch {
        window.open(videoUrl, '_blank');
      }
      return;
    }

    // For multiple scenes, download them sequentially
    const { downloadClipsSequentially } = await import('../utils/videoStitcher');
    await downloadClipsSequentially(
      readyScenes.map(s => ({
        url: s.enhancedVideoUrl || s.videoUrl!,
        title: s.title,
      })),
      safeTitle
    );
  };

  const effectiveNarrative = experience?.narrative || narrativePreview;

  const localizedPreviewMessages = useMemo(() => {
    const fallbacks = [
      '🎬 Your cinematic explanation is being crafted right now… While the video comes to life, here’s a quick preview of what you’re about to see.',
      '🚀 We’re generating your cinematic breakdown as we speak. Get a sneak peek below—this is just the beginning of what the video will reveal.',
      '🎥 Your video is on its way—and it’s worth the wait. In the meantime, here’s a preview of the story it’s about to tell.',
      '✨ Your cinematic explanation is unfolding right now. Dive into this preview while we bring the full visual story to life.',
      '🔥 We’re rendering your cinematic explanation now. Here’s a quick preview of what’s coming—trust us, you’ll want to see this.',
      '👀 Something cool is rendering… While your video is being generated, here’s a preview to get you started.',
      '🎬 Your cinematic explanation is being crafted right now—it\'s going to be worth the wait. While we render the video, here’s a sneak peek of what you’re about to experience.',
    ];

    return fallbacks.map((fallback, index) => {
      const key = `cinematicPreviewMessage${index + 1}`;
      const translated = t(key);
      return translated && translated !== key ? translated : fallback;
    });
  }, [t]);

  const previewMessage = useMemo(() => {
    const index = Math.floor(Math.random() * localizedPreviewMessages.length);
    return localizedPreviewMessages[index];
  }, [localizedPreviewMessages]);

  const narrativeDraftLabel = (() => {
    const translated = t('cinematicNarrativeDraft');
    return translated && translated !== 'cinematicNarrativeDraft' ? translated : 'Draft';
  })();

  const narrativeFinalLabel = (() => {
    const translated = t('cinematicNarrativeFinal');
    return translated && translated !== 'cinematicNarrativeFinal' ? translated : 'Final';
  })();

  const compactCardSizeClass = 'w-[220px] sm:w-[250px]';

  const mainDescription =
    narrativePreview ||
    experience?.description ||
    previewMessage;
  const displaySources = (experience?.sources || []).slice(0, 6);
  const selectedSceneError = selectedScene && 'error' in selectedScene ? selectedScene.error : undefined;
  const hasTemporaryClip =
    selectedScene?.status === 'ready' &&
    !!selectedSceneError &&
    selectedSceneError.includes('Temporary clip ready while we finish processing.');
  const finalSceneVideo = displayScenes.find(
    (scene) => scene.status === 'ready' && scene.sceneStage === 'final' && (scene.enhancedVideoUrl || scene.videoUrl)
  );
  const sendableVideoUrl = experience?.fullVideoUrl || finalSceneVideo?.enhancedVideoUrl || finalSceneVideo?.videoUrl;
  const canDownload = !!(experience?.fullVideoUrl || sendableVideoUrl || selectedScene?.videoUrl);

  const handleSendLinkCopy = async () => {
    if (!sendableVideoUrl) return;

    try {
      await navigator.clipboard.writeText(sendableVideoUrl);
      setSendLinkCopied(true);
      window.setTimeout(() => setSendLinkCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = sendableVideoUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setSendLinkCopied(true);
      window.setTimeout(() => setSendLinkCopied(false), 2000);
    }
  };

  const tabs = [
    { id: 'video', label: 'Video', icon: Film },
    { id: 'narrative', label: 'Narrative', icon: FileText },
    { id: 'sources', label: 'Sources', icon: Link2 },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
      {/* TopBar with question, arrow, share button, and tabs */}
      <div className="sticky top-0 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-10 transition-colors duration-200">
        {/* Top row with back arrow, query title and time */}
        <div className="px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-2">
              <button
                onClick={() => navigate('/')}
                className="transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex-shrink-0"
                style={{ color: 'var(--accent-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Film size={20} style={{ color: 'var(--accent-primary)' }} className="flex-shrink-0" />
                <h1 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white break-words line-clamp-2">
                  {query || 'Cinematic'}
                </h1>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-gray-500 dark:text-gray-400 flex-shrink-0">
                <Clock size={14} />
                <span className="text-xs">{timeAgo}</span>
              </div>
            </div>
            <ShareMenu
              url={window.location.href}
              title={experience?.title || query}
              text={experience?.description || ''}
            />
          </div>
        </div>

        {/* Progress bar when loading */}
        {isLoading && (
          <div className="px-4 sm:px-6 pb-3">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} className="animate-pulse" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{progress?.message || 'Preparing your answer'}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    width: `${Math.min(100, Math.max(0, progress?.progress || 0))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab navigation */}
        <div className="px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? ''
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    style={isActive ? {
                      borderColor: 'var(--accent-primary)',
                      color: 'var(--accent-primary)'
                    } : undefined}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            {displayScenes.some(s => s.status === 'ready') && (
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                Good news: Some scenes are ready! You can view them below.
              </p>
            )}
            <button
              onClick={load}
              className="mt-3 px-4 py-2 rounded-lg font-medium transition-colors bg-red-600 hover:bg-red-700 text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Video Tab */}
        {activeTab === 'video' && (
          <>
            {/* Video Player Section */}
            <div className="mb-6">
              {displayScenes.some(s => s.status === 'ready' && s.mixStatus === 'ready' && s.mixedVideoUrl) ? (
                <SequentialVideoPlayer
                  clips={displayScenes
                    .map((s) => ({ scene: s }))
                    .filter(({ scene }) => scene.status === 'ready' && scene.mixStatus === 'ready' && scene.mixedVideoUrl)
                    .map(({ scene: s }) => {
                      return {
                        id: s.id,
                        url: s.mixedVideoUrl!,
                        title: s.title || s.narration?.substring(0, 60),
                        duration: s.durationSeconds || 8,
                        isFinal: s.sceneStage === 'final',
                        isUpgrading: s.sceneStage !== 'final' && !!s.operationName,
                      };
                    })}
                  autoPlay={true}
                  loop={true}
                  enableDownload={true}
                  onDownload={handleDownload}
                  aspectRatio={aspectRatio}
                  transitionDuration={0}
                />
              ) : (
                <div className="bg-black rounded-lg aspect-square md:aspect-video flex items-center justify-center text-white">
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
                      <span>Preparing your cinematic experience...</span>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <p className="text-gray-400">No clips available yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video Info Card */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">

              {/* Video Title and Info Section - Added below video */}
              <div className="p-4 space-y-4">
                {/* Video Title */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 break-words">
                      {selectedScene?.title?.trim() || experience?.title || query}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>{timeAgo}</span>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={load}
                      className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Regenerate"
                      title="Regenerate"
                    >
                      <RefreshCw size={18} />
                    </button>
                    <button
                      onClick={handleSendLinkCopy}
                      disabled={!sendableVideoUrl}
                      className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={sendLinkCopied ? 'Link copied' : 'Copy video link'}
                      title={sendLinkCopied ? 'Link copied' : 'Copy video link'}
                    >
                      <Link2 size={18} />
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={!canDownload}
                      className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Download MP4"
                      title="Download MP4"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>

                {/* Temporary clip warning */}
                {hasTemporaryClip && (
                  <div className="rounded-lg border border-amber-300/70 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                    <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                      This clip is available in temporary mode while we finish processing the final saved version.
                    </p>
                  </div>
                )}

                {/* Video Description */}
                {mainDescription && (
                  <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
                    {narrativePreview && (
                      <div className="mb-2">
                        <NarrativePhaseBadge
                          phase={narrativePhase}
                          draftLabel={narrativeDraftLabel}
                          finalLabel={narrativeFinalLabel}
                        />
                      </div>
                    )}
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {mainDescription}
                    </p>
                  </div>
                )}

                {sendLinkCopied && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Link copied</p>
                )}
              </div>
            </div>

            {/* Scenes Carousel - Below video in Video tab */}
            {displayScenes.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Scenes</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {displayScenes.length} {displayScenes.length === 1 ? 'clip' : 'clips'} • {displayScenes.reduce((total, scene) => total + (scene.durationSeconds || 7), 0)}s
                  </p>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {/* Individual Scene Cards */}
                  {displayScenes.map((scene, index) => {
                    // Show mixed video if ready, otherwise show draft/raw video in carousel
                    const sceneVideoUrl = scene.mixedVideoUrl || scene.enhancedVideoUrl || scene.videoUrl || scene.rawVideoUrl;
                    const sceneLabel = scene.title?.trim() || scene.narration?.trim() || `Scene ${index + 1}`;
                    const isMixing = scene.status === 'ready' && scene.mixStatus !== 'ready' && !scene.mixedVideoUrl;
                    return (
                      <div
                        key={scene.id}
                        onMouseEnter={() => setHoveredSceneId(scene.id)}
                        onMouseLeave={() => setHoveredSceneId((current) => (current === scene.id ? null : current))}
                        onFocus={() => setHoveredSceneId(scene.id)}
                        onBlur={() => setHoveredSceneId((current) => (current === scene.id ? null : current))}
                        className={`text-left ${compactCardSizeClass} rounded-lg border overflow-hidden transition-colors flex-shrink-0 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600`}
                        tabIndex={0}
                      >
                        <div className="aspect-video bg-black relative">
                          {sceneVideoUrl ? (
                            <>
                              <video
                                src={sceneVideoUrl}
                                className="w-full h-full object-cover"
                                controls={hoveredSceneId === scene.id}
                                playsInline
                                preload="metadata"
                                disablePictureInPicture
                              />
                              {/* Mixing overlay indicator */}
                              {isMixing && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <div className="bg-white/90 px-3 py-1.5 rounded-full text-xs font-medium text-gray-900">
                                    Adding audio...
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 px-3 text-center">
                              {scene.status === 'error' ? scene.error || 'This clip could not be completed' : 'Preparing clip...'}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{sceneLabel}</p>
                          {/* Show ONLY ONE badge - priority order: Processing > Final > Mixing > Ready > Preview > Draft */}
                          {scene.error && scene.status === 'ready' && scene.error.includes('Temporary clip ready while we finish processing.') ? (
                            <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/35 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                              Processing final version
                            </span>
                          ) : scene.sceneStage === 'final' && scene.mixedVideoUrl ? (
                            <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/35 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                              Final
                            </span>
                          ) : isMixing ? (
                            <span className="mt-1 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/35 px-2 py-0.5 text-[10px] font-medium text-blue-800 dark:text-blue-300">
                              Mixing...
                            </span>
                          ) : scene.mixStatus === 'ready' && scene.mixedVideoUrl ? (
                            <span className="mt-1 inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/35 px-2 py-0.5 text-[10px] font-medium text-green-800 dark:text-green-300">
                              Ready
                            </span>
                          ) : scene.sceneStage === 'preview' ? (
                            <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/35 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                              Preview
                            </span>
                          ) : scene.sceneStage === 'draft' ? (
                            <span className="mt-1 inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/35 px-2 py-0.5 text-[10px] font-medium text-indigo-800 dark:text-indigo-300">
                              Draft
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Narrative Tab */}
        {activeTab === 'narrative' && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            {!!effectiveNarrative && (
              <div className="mb-3">
                <NarrativePhaseBadge
                  phase={narrativePhase}
                  draftLabel={narrativeDraftLabel}
                  finalLabel={narrativeFinalLabel}
                />
              </div>
            )}
            {isLoading && !effectiveNarrative && (
              <div className="flex items-center gap-3 mb-4 text-gray-600 dark:text-gray-400">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full animate-ping absolute" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.4 }}></div>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                </div>
                <span className="text-sm">Generating your explanation...</span>
              </div>
            )}
            <div className="prose prose-base dark:prose-invert max-w-none">
              <LightMarkdown>
                {effectiveNarrative || '_We are preparing your explanation now..._'}
              </LightMarkdown>
            </div>
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === 'sources' && (
          <div className="space-y-3">
            {displaySources.length > 0 ? (
              displaySources.map((source, index) => {
                const cleanDomain = extractDomainName(source.url);
                const fullDomain = (() => {
                  try {
                    return new URL(source.url).hostname.replace('www.', '');
                  } catch {
                    return '';
                  }
                })();

                return (
                  <a
                    key={`${source.url}-${index}`}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 bg-white dark:bg-gray-800 hover:shadow-md cursor-pointer"
                  >
                    {/* Left side - content */}
                    <div className="flex-1 min-w-0">
                      {/* Favicon + Domain name */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          {fullDomain && (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${fullDomain}&sz=32`}
                              alt=""
                              className="w-4 h-4 rounded-sm"
                              loading="lazy"
                              onError={(e) => {
                                // Hide on error - parent container provides fallback background
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">
                          {cleanDomain || fullDomain}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {source.title}
                      </h3>

                      {/* Snippet */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {source.snippet}
                      </p>
                    </div>

                    {/* Right side - thumbnail (if available) */}
                    {source.image && (
                      <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img
                          src={source.image}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.parentElement!.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </a>
                );
              })
            ) : (
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  {isLoading ? 'Collecting sources...' : 'No sources available'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Related Topics / Continue Exploring - Show in all tabs */}
        {(experience?.relatedTopics?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-4 sm:p-5 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={16} />
              <h3 className="text-base font-semibold">Continue Exploring</h3>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {(experience?.relatedTopics || []).map((topic) => (
                <button
                  key={topic.title}
                  onClick={() => navigate(`/cinematic-results?q=${encodeURIComponent(topic.title)}`)}
                  className={`text-left ${compactCardSizeClass} rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-gray-400 dark:hover:border-gray-600 transition-colors`}
                >
                  <div className="aspect-video bg-gray-100 dark:bg-gray-900">
                    {topic.imageUrl ? (
                      <img src={topic.imageUrl} alt={topic.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No image</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-2">{topic.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname.split('.')[0] || 'source';
  } catch {
    return 'source';
  }
}

function NarrativePhaseBadge({
  phase,
  draftLabel,
  finalLabel,
}: {
  phase: 'draft' | 'final';
  draftLabel: string;
  finalLabel: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${
        phase === 'final'
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-300'
      }`}
    >
      {phase === 'final' ? finalLabel : draftLabel}
    </span>
  );
}
