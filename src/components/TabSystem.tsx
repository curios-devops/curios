// Magazine story view (/stories-results): tabs Story · Images · Videos · News · Sources.
// The cover is a news photo for current events or an AI image for general topics (the reader
// can switch Photo / AI); AI covers carry a subtle Curios watermark. Listening is free.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Image, Video, Globe, ChevronDown, Loader2, Headphones, Pause, Newspaper } from 'lucide-react';
import { useAccentColor } from '../hooks/useAccentColor';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';
import { generateArticleImage, extractArticleSummary } from '../services/stories/agents/imageGenerationService';
import { NarrationService } from '../services/movie/audio/NarrationService';
import { NanoBananaProvider } from '../services/movie/providers/NanoBananaProvider';
import { getCached, setCached } from '../services/search/searchCache';
import CuriosLogo from './common/CuriosLogo';
import type { StoryResult } from '../services/stories/agents/storyAgent';

// Standard ElevenLabs premade voices for the listen picker.
const ELEVENLABS_VOICES: { id: string; name: string; tone: string }[] = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', tone: 'Soft' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', tone: 'Calm' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', tone: 'Strong' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', tone: 'Deep' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', tone: 'Warm' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', tone: 'Young' },
];

// Strip markdown/HTML and cap length so the TTS request stays within provider limits.
const stripForTts = (md: string): string =>
  md
    .replace(/<[^>]*>/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
import CustomMarkdown from './CustomMarkdown';
import FollowUps from './FollowUps';
import { toCitations } from './citations/toCitations';
import DynamicShareRow from './share/DynamicShareRow';

// Helper function to calculate reading and listening time
const calculateReadingTime = (text: string) => {
  const wordsPerMinute = 200;
  const listeningWordsPerMinute = 150;
  
  // Strip HTML and markdown, count words
  const plainText = text
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = plainText.split(' ').filter(word => word.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(words / wordsPerMinute));
  
  // Calculate listening time in minutes and seconds
  const totalListeningSeconds = Math.ceil(words / listeningWordsPerMinute * 60);
  const listeningMinutes = Math.floor(totalListeningSeconds / 60);
  const listeningSeconds = totalListeningSeconds % 60;
  
  return { 
    readingTime, 
    listeningTime: `${listeningMinutes}:${String(listeningSeconds).padStart(2, '0')}` 
  };
};

interface TabSystemProps {
  result: StoryResult;
  loading: boolean;
  /** The section the story was written for ("Science", "Local · Santiago"). */
  sectionLabel: string;
  /** Current news → the cover defaults to a news photo; otherwise to an AI image. */
  isNews: boolean;
  /** The story's cache key (the AI cover is kept with it). */
  cacheKey: string;
  /** "Go deeper": Astra continues the story along `result.deeper` (the page appends it). */
  onDeepen?: () => Promise<void>;
}

type Tab = 'curios' | 'images' | 'videos' | 'news' | 'sources';

interface SourceItemProps {
  source: StoryResult['sources'][number];
  index: number;
}

const SourceItem: React.FC<SourceItemProps> = ({ source, index }) => (
  <div className="flex gap-4 p-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <div className="flex-1">
      <div className="flex items-start gap-4">
        <span className="text-[#0095FF] font-semibold text-base bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full min-w-[32px] text-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-medium text-[#0095FF] dark:text-[#0095FF] mb-1 hover:underline cursor-pointer line-clamp-2">
            {source.title}
          </h3>
          <div className="text-sm text-green-700 dark:text-green-400 mb-3 truncate">
            {source.url}
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {source.snippet}
          </p>
        </div>
      </div>
    </div>
    
    {/* Image on the right */}
    {source.image && (
      <div className="flex-shrink-0 ml-4">
        <img 
          src={source.image} 
          alt=""
          className="w-24 h-18 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
        />
      </div>
    )}
  </div>
);

export const TabSystem: React.FC<TabSystemProps> = ({ result, loading, sectionLabel, isNews, cacheKey, onDeepen }) => {
  const [deepening, setDeepening] = useState(false);
  const [deepenFailed, setDeepenFailed] = useState(false);
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const citations = useMemo(() => toCitations(result?.sources ?? []), [result?.sources]);
  const [activeTab, setActiveTab] = useState<Tab>('curios');
  const [featuredImageIndex, setFeaturedImageIndex] = useState(0);
  const [validImageIndices, setValidImageIndices] = useState<number[]>([]); // images that actually load
  const [isValidatingImages, setIsValidatingImages] = useState(false);
  // Cover: 'photo' (search image) or 'ai' (generated for the article).
  const aiKey = `${cacheKey}|ai-cover`;
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(() => getCached<string>(aiKey)?.value ?? null);
  const [aiFailed, setAiFailed] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [coverMode, setCoverMode] = useState<'photo' | 'ai'>(isNews ? 'photo' : 'ai');
  // Listening (free)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(ELEVENLABS_VOICES[0].id);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceDropdownRef = useRef<HTMLDivElement>(null);
  const accent = useAccentColor();

  // Validate images on load - only show images that successfully load
  useEffect(() => {
    if (!result?.images || result.images.length === 0) {
      setValidImageIndices([]);
      setFeaturedImageIndex(0);
      return;
    }
    setIsValidatingImages(true);
    const validateImage = (url: string, index: number): Promise<number | null> => new Promise((resolve) => {
      const img = document.createElement('img') as HTMLImageElement;
      img.onload = () => resolve(index);
      img.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 5000);
      img.src = url;
    });
    Promise.all(result.images.map((img, index) => validateImage(img.image || img.url, index)))
      .then((results) => {
        const validIndices = results.filter((idx): idx is number => idx !== null);
        setValidImageIndices(validIndices);
        if (validIndices.length > 0) setFeaturedImageIndex(validIndices[0]);
        setIsValidatingImages(false);
      });
  }, [result?.images]);

  const hasPhoto = validImageIndices.length > 0;
  // No usable photo for a news story → the AI cover; the AI cover failed → the photo.
  const showAi = (coverMode === 'ai' || (!hasPhoto && !isValidatingImages)) && !aiFailed;

  // AI cover: generated once per story (Nano Banana; GPT Image 2 as fallback), kept in the cache.
  useEffect(() => {
    if (!showAi || aiImageUrl || isGeneratingImage || !result) return;
    let live = true;
    setIsGeneratingImage(true);
    const idea = result.image_prompt || `${result.headline}. ${extractArticleSummary(result.markdown_report || '')}`;
    const prompt = `Editorial magazine cover image, 16:9: ${idea}. Sophisticated, striking composition. Absolutely no text, letters, logos or watermarks.`;
    new NanoBananaProvider().generate(prompt, { userId: 'curios-guest' })
      .catch(() => generateArticleImage({ articleTitle: result.headline, articleSummary: idea, quality: 'low' }).then((r) => r.url))
      .then((url) => { setCached(aiKey, url); if (live) setAiImageUrl(url); })
      .catch(() => { if (live) setAiFailed(true); })
      .finally(() => { if (live) setIsGeneratingImage(false); });
    return () => { live = false; };
  }, [showAi, aiImageUrl, result]);

  const handleFollowUpClick = (question: string) => {
    window.location.href = `/stories-results?${new URLSearchParams({ q: question }).toString()}`;
  };

  // Stop audio playback on unmount
  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  useEffect(() => {
    if (!showVoiceDropdown) return;
    const close = (event: MouseEvent) => {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target as Node)) setShowVoiceDropdown(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showVoiceDropdown]);

  // A voice change resets the audio so the next play uses it.
  const handleDeepen = async () => {
    if (!onDeepen || deepening) return;
    setDeepening(true);
    setDeepenFailed(false);
    try {
      await onDeepen();
      resetAudio(); // the narration must cover the longer story
    } catch {
      setDeepenFailed(true);
    } finally {
      setDeepening(false);
    }
  };

  const resetAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
  };

  // Listen (ElevenLabs TTS) — free for everyone.
  const handleListen = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    if (audioRef.current) {
      if (audioRef.current.ended) audioRef.current.currentTime = 0;
      await audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      return;
    }
    const text = stripForTts(result?.markdown_report || '');
    if (!text) return;
    try {
      setIsGeneratingAudio(true);
      const res = await new NarrationService().generateNarration([{ text, startTime: 0, duration: 0 }], { voice: selectedVoice });
      const audio = new Audio(res.audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      audioRef.current = audio;
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('[Listen] TTS generation failed', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const news = result?.news ?? [];
  const tabs: { id: Tab; label: string; icon?: React.ReactNode }[] = [
    { id: 'curios', label: t('magTab_story') },
    ...(hasPhoto ? [{ id: 'images' as Tab, label: `${t('magTab_images')} · ${validImageIndices.length}`, icon: <Image size={16} /> }] : []),
    ...(result?.videos?.length ? [{ id: 'videos' as Tab, label: `${t('magTab_videos')} · ${result.videos.length}`, icon: <Video size={16} /> }] : []),
    ...(news.length ? [{ id: 'news' as Tab, label: `${t('magTab_news')} · ${news.length}`, icon: <Newspaper size={16} /> }] : []),
    { id: 'sources', label: `${t('magTab_sources')}${result?.sources ? ` · ${result.sources.length}` : ''}`, icon: <Globe size={16} /> },
  ];

  const pillStyle = (on: boolean) => on
    ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }
    : { color: 'var(--ui-text-secondary)' };

  return (
    <div className="bg-white dark:bg-night-900">
      {/* Tab Headers — same style as Search (TopBar): underline-on-active, accent color */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  isActive ? '' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                style={isActive ? { borderColor: accent.primary, color: accent.primary } : undefined}
              >
                {tab.icon && <span className="flex items-center">{tab.icon}</span>}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'curios' && (
          <div className="space-y-6">
            {!loading && result ? (
              <>
                {/* Magazine header: section kicker, headline, dek */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>{sectionLabel}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">{new Date().toLocaleDateString(currentLanguage.code, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <h1 className="font-bricolage text-2xl sm:text-4xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
                    {result.headline}
                  </h1>
                  {result.subtitle && (
                    <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">{result.subtitle}</p>
                  )}

                  {/* Cover: AI image (watermarked) or news photo */}
                  <div className="my-6">
                    <div className="-mx-6 sm:mx-0 overflow-hidden border-y border-gray-200 dark:border-gray-700 sm:rounded-xl sm:border relative aspect-video bg-gray-100 dark:bg-gray-800">
                      {showAi ? (
                        aiImageUrl ? (
                          <>
                            <img src={aiImageUrl} alt={result.headline} className="w-full h-full object-cover" onError={() => setAiFailed(true)} />
                            {/* Subtle Curios watermark on generated images */}
                            <span className="absolute bottom-3 right-3 opacity-60 drop-shadow" aria-hidden>
                              <CuriosLogo size={22} frameColor="#FFFFFF" colorOverride="#FFFFFF" />
                            </span>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 animate-pulse">
                            <Loader2 size={28} className="animate-spin text-gray-400" />
                          </div>
                        )
                      ) : hasPhoto ? (
                        <img
                          src={result.images![featuredImageIndex].url}
                          alt={result.images![featuredImageIndex]?.alt || result.headline}
                          className="w-full h-full object-cover"
                          onError={() => {
                            const next = validImageIndices[validImageIndices.indexOf(featuredImageIndex) + 1];
                            if (next !== undefined) setFeaturedImageIndex(next);
                            else setValidImageIndices(validImageIndices.filter((idx) => idx !== featuredImageIndex));
                          }}
                        />
                      ) : null}
                    </div>

                    {/* Listen · voice, and the Photo / AI cover selector */}
                    <div className="flex justify-between items-center mt-3">
                      {(() => {
                        const { listeningTime } = calculateReadingTime(result.markdown_report || '');
                        return (
                          <div className="flex items-center gap-1 text-sm relative" ref={voiceDropdownRef}>
                            <button
                              type="button"
                              onClick={handleListen}
                              disabled={isGeneratingAudio}
                              aria-label={isPlaying ? 'Pause' : 'Listen'}
                              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:opacity-80 transition-colors disabled:cursor-wait"
                            >
                              {isGeneratingAudio ? <Loader2 size={16} className="animate-spin" /> : isPlaying ? <Pause size={16} /> : <Headphones size={16} />}
                              <span className="tabular-nums">{listeningTime} min</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowVoiceDropdown((v) => !v)}
                              aria-label="Voice"
                              className="flex items-center px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <ChevronDown size={14} />
                            </button>
                            {showVoiceDropdown && (
                              <div
                                className="absolute bottom-full left-0 mb-2 rounded-lg shadow-lg border overflow-hidden min-w-[180px] z-20"
                                style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
                              >
                                {ELEVENLABS_VOICES.map((v) => {
                                  const active = v.id === selectedVoice;
                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => { setSelectedVoice(v.id); setShowVoiceDropdown(false); resetAudio(); }}
                                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--ui-bg-secondary)]"
                                      style={{ color: active ? 'var(--accent-primary)' : 'var(--ui-text-primary)', fontWeight: active ? 500 : 400 }}
                                    >
                                      <span>{v.name} <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>· {v.tone}</span></span>
                                      {active && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 p-0.5 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setCoverMode('photo')}
                          disabled={!hasPhoto}
                          className="px-3 py-1 rounded-full transition-colors disabled:opacity-40"
                          style={pillStyle(!showAi)}
                        >
                          {t('magPhoto')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAiFailed(false); setCoverMode('ai'); }}
                          className="px-3 py-1 rounded-full transition-colors"
                          style={pillStyle(showAi)}
                        >
                          {t('magAI')}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <DynamicShareRow
                        serviceType="stories"
                        payload={{
                          title: result.headline || 'Curios Magazine',
                          description: result.subtitle || (result.markdown_report ? result.markdown_report.slice(0, 200) : ''),
                          text: result.subtitle || (result.markdown_report ? result.markdown_report.slice(0, 100) : ''),
                          imageUrls: [...(aiImageUrl ? [aiImageUrl] : []), ...(result.images || []).map((img) => img.url)],
                          deepLink: globalThis.location.href,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Article Body — same markdown renderer as Search */}
                <div className="prose dark:prose-invert max-w-none break-words">
                  <CustomMarkdown citations={citations}>{result.markdown_report || ''}</CustomMarkdown>
                </div>

                {result.deeper && onDeepen && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleDeepen}
                      disabled={deepening}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-left hover:opacity-80 transition-opacity disabled:cursor-wait"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      <span>{result.deeper}</span>
                      {deepening ? <Loader2 size={15} className="animate-spin flex-shrink-0" /> : <ChevronDown size={15} className="flex-shrink-0" />}
                    </button>
                    {deepenFailed && <p className="mt-1 text-xs text-red-500">{t('magDeeperError')}</p>}
                  </div>
                )}

                <div className="mt-8">
                  <FollowUps questions={result.follow_up_questions ?? []} onPick={handleFollowUpClick} />
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">…</div>
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {(result?.sources ?? []).map((source, index) => (
              <SourceItem key={index} source={source} index={index} />
            ))}
          </div>
        )}

        {activeTab === 'news' && (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {news.map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="group flex gap-3 py-4 first:pt-0">
                <img src={`https://www.google.com/s2/favicons?domain=${item.source}&sz=32`} alt="" className="w-4 h-4 mt-1 rounded-sm flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="min-w-0">
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">{item.source}</span>
                  <span className="block font-medium text-gray-900 dark:text-white group-hover:text-[var(--accent-primary)] transition-colors line-clamp-2">{item.title}</span>
                  {item.snippet && <span className="block mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.snippet}</span>}
                </span>
              </a>
            ))}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {validImageIndices.map((imageIndex: number) => {
              const image = result.images![imageIndex];
              return (
                <div key={imageIndex} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group relative">
                  <img
                    src={image.image || image.url}
                    alt={image.alt || `Image ${imageIndex + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => window.open(image.url, '_blank')}
                    onError={() => setValidImageIndices((prev) => prev.filter((idx) => idx !== imageIndex))}
                  />
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="grid gap-4">
            {(result?.videos ?? []).map((video, index) => (
              <a key={index} href={video.url} target="_blank" rel="noopener noreferrer" className="group flex gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                <div className="flex-shrink-0 w-36 aspect-video bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                  {video.thumbnail
                    ? <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Video size={24} className="text-gray-400" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-[var(--accent-primary)] line-clamp-2">{video.title}</span>
                  {video.duration && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{video.duration}</p>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabSystem;
