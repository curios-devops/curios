// Magazine (route /stories-results): the answer as a magazine story. The search starts at
// once while Decisions picks the sections (the main one + three more, NYT / Wired desks);
// "change focus" rewrites the story from another section's angle with the same sources.
// Decisions also rates the question: complex → Sol writes it, otherwise Luna; Astra is kept
// for "go deeper", which continues the story. Free for everyone. Finished stories are cached for the visit (per question + section).
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { storiesService, StoryProgressCallback } from '../agents/storiesService';
import type { StoryResult } from '../agents/storyAgent.ts';
import { SearchResult } from '../types.ts';
import SourcesLoader from '../../../components/SourcesLoader';
import TabSystem from '../../../components/TabSystem';
import { appSettings } from '../../../config/appSettings.ts';
import { useAccentColor } from '../../../hooks/useAccentColor';
import { useGoBack } from '../../../hooks/useGoBack.ts';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { saveNode } from '../../space/nodePersistenceService';
import { fetchMagazinePlan, MAGAZINE_SECTIONS, type MagazinePlan, type MagazineSection } from '../../auto/intentRouter.ts';
import { stepUp } from '../../auto/modelTier.ts';
import { getCached, setCached } from '../../search/searchCache.ts';
import { readerGeo } from '../../../utils/readerGeo.ts';

interface ProgressState {
  stage: string;
  timeRemaining: string;
  progress: number;
  thinkingSteps: string[];
  searchTerms: string[];
  sources: SearchResult[];
  currentAgent?: string;
  agentActions?: string[];
  storyPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing';
}

const INITIAL_PROGRESS: ProgressState = {
  stage: 'Shaping Your Story',
  timeRemaining: 'About 1-2 minutes remaining',
  progress: 0,
  thinkingSteps: [],
  searchTerms: [],
  sources: [],
  currentAgent: 'StoryWriter',
  agentActions: [],
  storyPhase: 'analyzing',
};

export default function StoriesResults() {
  const goBack = useGoBack();
  const navigate = useNavigate();
  const location = useLocation();
  const accent = useAccentColor();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const askedSection = searchParams.get('section') as MagazineSection | null;
  const longRead = searchParams.get('long') === '1';
  const [city, setCity] = useState('');
  const [focusOpen, setFocusOpen] = useState(false);
  const focusRef = useRef<HTMLDivElement>(null);

  const [plan, setPlan] = useState<MagazinePlan | null>(() => getCached<MagazinePlan>(`magazine-plan|${query}`)?.value ?? null);
  const section: MagazineSection | null = askedSection && (MAGAZINE_SECTIONS as readonly string[]).includes(askedSection)
    ? askedSection
    : plan?.sections[0] ?? null;
  const storyKey = `magazine|${query}|${section}|${currentLanguage.code}${longRead ? '|long' : ''}`;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressState, setProgressState] = useState<ProgressState>(INITIAL_PROGRESS);
  const runKey = useRef('');

  const handleProgress = ((
    stage: string, timeRemaining: string, progress: number, thinkingStep: string,
    searchTerms: string[] = [], sources: SearchResult[] = [], currentAgent?: string, agentAction?: string,
    storyPhase?: ProgressState['storyPhase']
  ) => {
    setProgressState(prev => ({
      stage,
      timeRemaining,
      progress,
      thinkingSteps: thinkingStep ? [...prev.thinkingSteps, thinkingStep] : prev.thinkingSteps,
      searchTerms: searchTerms.length > 0 ? searchTerms : prev.searchTerms,
      sources: sources.length > 0 ? sources : prev.sources,
      currentAgent: currentAgent || prev.currentAgent,
      agentActions: agentAction ? [...(prev.agentActions || []), agentAction] : prev.agentActions || [],
      storyPhase: storyPhase || prev.storyPhase,
    }));
  }) as StoryProgressCallback;

  // 1) Sections (Decisions) and the search start together.
  useEffect(() => {
    if (!query) return;
    storiesService.prefetch(query, handleProgress);
    let live = true;
    void readerGeo().then(async ({ city: c }) => {
      if (live) setCity(c);
      if (plan) return;
      const p = await fetchMagazinePlan(query, c);
      setCached(`magazine-plan|${query}`, p);
      if (live) setPlan(p);
    });
    return () => { live = false; };
  }, [query]);

  // 2) The story for the active section (cached per question + section + language).
  useEffect(() => {
    if (!query || !section || !plan || runKey.current === storyKey) return;
    runKey.current = storyKey;
    const cached = getCached<StoryResult>(storyKey)?.value;
    if (cached) {
      setResult(cached);
      setError(null);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressState((p) => ({ ...p, storyPhase: 'synthesizing' }));
    // Luna, or Sol when Decisions rates the question complex; Long Read goes one model up.
    const baseModel = plan.tier && plan.tier !== 'complex' ? appSettings.models.luna : appSettings.models.sol;
    storiesService.performStoryAnalysis(query, handleProgress, {
      section,
      location: city,
      language: currentLanguage.code,
      model: longRead ? stepUp(baseModel) : baseModel,
      long: longRead,
    })
      .then((story) => {
        setCached(storyKey, story);
        if (!live) return;
        setResult(story);
        setLoading(false);
        // Auto-save as a curiosity node (authenticated only; no-op for guests).
        saveNode({
          mode: 'stories',
          query,
          answer: story.markdown_report,
          shortSummary: story.short_summary,
          sources: (story.sources || []).map((s) => ({ title: s.title, url: s.url, snippet: s.snippet })),
          images: (story.images || []).map((i) => ({ url: i.url, title: i.title || i.alt || '', source: i.source_url })),
          videos: (story.videos || []).map((v) => ({ url: v.url, title: v.title, thumbnail: v.thumbnail || '' })),
          followUps: story.follow_up_questions,
          coverImage: story.images?.[0]?.url,
        });
      })
      .catch((err: Error) => {
        if (!live) return;
        setError(err.message || 'The story could not be written. Please try again.');
        setLoading(false);
      });
    return () => { live = false; runKey.current = ''; };
  }, [query, storyKey, plan]);

  useEffect(() => {
    if (!focusOpen) return;
    const close = (e: MouseEvent) => { if (!focusRef.current?.contains(e.target as Node)) setFocusOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [focusOpen]);

  // "Go deeper": Astra continues the story; the longer story replaces the cached one.
  const deepen = async () => {
    if (!result || !section) return;
    const more = await storiesService.deepen(result, { section, location: city, language: currentLanguage.code });
    const next = { ...result, markdown_report: `${result.markdown_report}\n\n${more}`, deeper: undefined };
    setCached(storyKey, next);
    setResult(next);
  };

  // "Long Read" (Magazine's Ask Deeper): free; same question and section, longer and deeper.
  const toggleLongRead = () => {
    const params = new URLSearchParams(location.search);
    if (longRead) params.delete('long'); else params.set('long', '1');
    navigate(`/stories-results?${params.toString()}`);
  };

  const pickSection = (id: MagazineSection) => {
    setFocusOpen(false);
    if (id === section) return;
    const params = new URLSearchParams(location.search);
    params.set('section', id);
    navigate(`/stories-results?${params.toString()}`);
  };
  const sectionName = (id: MagazineSection) => (id === 'local' && city ? `${t('magSection_local')} · ${city}` : t(`magSection_${id}` as never));

  return (
    <div className="stories-result-page min-h-screen bg-white dark:bg-night-900 text-gray-900 dark:text-white transition-colors duration-200">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 pt-6 pb-3">
        <button type="button" onClick={goBack} style={{ color: accent.primary }} className="hover:opacity-80 transition-opacity flex-shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-[70%] sm:min-w-0">
          <h1 className="text-base sm:text-lg font-medium break-words max-h-24 overflow-y-auto pr-1">{query}</h1>
        </div>
        <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={toggleLongRead}
          aria-pressed={longRead}
          className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium text-[var(--ui-text-on-accent)] whitespace-nowrap transition-all hover:opacity-90"
          style={{
            backgroundColor: 'var(--accent-primary)',
            boxShadow: longRead ? '0 0 0 3px color-mix(in srgb, var(--accent-primary) 30%, transparent)' : undefined,
          }}
        >
          {t('magLongRead')}
        </button>
        {/* Change focus: the three other sections Decisions suggested, to rewrite the story from. */}
        {plan && section && (
          <div className="relative flex-shrink-0" ref={focusRef}>
            <button
              type="button"
              onClick={() => setFocusOpen((o) => !o)}
              aria-expanded={focusOpen}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors whitespace-nowrap"
            >
              {t('magChangeFocus')}
            </button>
            {focusOpen && (
              <div
                className="absolute right-0 top-full mt-2 rounded-lg shadow-lg border overflow-hidden min-w-[200px] z-20"
                style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
              >
                {plan.sections.filter((id) => id !== section).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pickSection(id)}
                    className="w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--ui-bg-secondary)]"
                    style={{ color: 'var(--ui-text-primary)' }}
                  >
                    {sectionName(id)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-0 sm:px-6 py-6">
        {loading && (
          <SourcesLoader sources={progressState.sources} />
        )}
        {error && (
          <div className="bg-white dark:bg-night-850 rounded-xl border border-red-500/20 p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => globalThis.location.reload()}
              className="bg-red-500/10 text-red-500 px-6 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        {!loading && result && section && (
          <TabSystem
            result={result}
            loading={loading}
            sectionLabel={sectionName(section)}
            isNews={(plan?.news ?? 0) >= 0.5}
            cacheKey={storyKey}
            onDeepen={deepen}
          />
        )}
      </main>
    </div>
  );
}
