// Magazine (route /stories-results): the answer as a magazine story. The search starts at
// once while Decisions picks the sections (the main one + three more, NYT / Wired desks);
// tapping another section rewrites the story from that angle with the same sources.
// Free for everyone. Finished stories are cached for the visit (per question + section).
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { storiesService, StoryProgressCallback } from '../agents/storiesService';
import type { StoryResult } from '../agents/storyAgent.ts';
import { SearchResult } from '../types.ts';
import ResearchProgress from '../../../components/ResearchProgress';
import TabSystem from '../../../components/TabSystem';
import CuriosLogo from '../../../components/common/CuriosLogo.tsx';
import { appSettings } from '../../../config/appSettings.ts';
import { useAccentColor } from '../../../hooks/useAccentColor';
import { useGoBack } from '../../../hooks/useGoBack.ts';
import { useAnswerModel } from '../../../hooks/useAnswerModel.ts';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import AstraNotice from '../../../components/AstraNotice.tsx';
import { saveNode } from '../../space/nodePersistenceService';
import { fetchMagazinePlan, MAGAZINE_SECTIONS, type MagazinePlan, type MagazineSection } from '../../auto/intentRouter.ts';
import { getCached, setCached } from '../../search/searchCache.ts';

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

// The reader's city from the browser's time zone ("America/Santiago" → "Santiago"): Local's place.
const readerCity = () => (Intl.DateTimeFormat().resolvedOptions().timeZone?.split('/').pop() ?? '').replace(/_/g, ' ');

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
  const { getModel, answerModel, continueWithAstra } = useAnswerModel(query);
  const city = readerCity();

  const [plan, setPlan] = useState<MagazinePlan | null>(() => getCached<MagazinePlan>(`magazine-plan|${query}`)?.value ?? null);
  const section: MagazineSection | null = askedSection && (MAGAZINE_SECTIONS as readonly string[]).includes(askedSection)
    ? askedSection
    : plan?.sections[0] ?? null;
  const storyKey = `magazine|${query}|${section}|${currentLanguage.code}`;

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
    if (plan) return;
    let live = true;
    void fetchMagazinePlan(query, city).then((p) => {
      setCached(`magazine-plan|${query}`, p);
      if (live) setPlan(p);
    });
    return () => { live = false; };
  }, [query]);

  // 2) The story for the active section (cached per question + section + language).
  useEffect(() => {
    if (!query || !section || runKey.current === storyKey) return;
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
    storiesService.performStoryAnalysis(query, handleProgress, {
      section,
      location: city,
      language: currentLanguage.code,
      model: getModel().then((m) => m.model),
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
  }, [query, storyKey]);

  const pickSection = (id: MagazineSection) => {
    if (id === section) return;
    const params = new URLSearchParams(location.search);
    params.set('section', id);
    navigate(`/stories-results?${params.toString()}`);
  };
  const sectionName = (id: MagazineSection) => (id === 'local' && city ? `${t('magSection_local')} · ${city}` : t(`magSection_${id}` as never));

  const phaseIcon = (phase?: string) => {
    switch (phase) {
      case 'searching': return <Search className="text-green-500" size={14} />;
      case 'synthesizing': return <Sparkles style={{ color: accent.primary }} size={14} />;
      case 'finalizing': return <CheckCircle2 className="text-green-500" size={14} />;
      default: return <CuriosLogo size={14} frameColor={appSettings.logoMark.iconColor} />;
    }
  };

  return (
    <div className="stories-result-page min-h-screen bg-white dark:bg-[#111111] text-gray-900 dark:text-white transition-colors duration-200">
      <header className="flex items-center gap-4 px-6 pt-6 pb-3">
        <button type="button" onClick={goBack} style={{ color: accent.primary }} className="hover:opacity-80 transition-opacity flex-shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-medium break-words max-h-24 overflow-y-auto pr-1">{query}</h1>
          {loading && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full flex-shrink-0">
              {phaseIcon(progressState.storyPhase)}
              <span className="text-xs font-medium capitalize">{progressState.storyPhase}</span>
            </div>
          )}
        </div>
      </header>

      {/* Sections, NYT style: the main one and three more angles to rewrite it from. */}
      {plan && (
        <nav className="max-w-4xl mx-auto px-6 flex gap-5 overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-gray-800">
          {plan.sections.map((id) => {
            const active = id === section;
            return (
              <button
                key={id}
                type="button"
                onClick={() => pickSection(id)}
                aria-current={active ? 'page' : undefined}
                className={`py-2.5 border-b-2 -mb-px text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${active ? '' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                style={active ? { borderColor: accent.primary, color: accent.primary } : undefined}
              >
                {sectionName(id)}
              </button>
            );
          })}
        </nav>
      )}

      <main className="max-w-4xl mx-auto px-0 sm:px-6 py-6">
        {loading && (
          <ResearchProgress
            stage={progressState.stage}
            timeRemaining={progressState.timeRemaining}
            progress={progressState.progress}
            thinkingSteps={progressState.thinkingSteps}
            isComplete={false}
            searchTerms={progressState.searchTerms}
            sources={progressState.sources}
          />
        )}
        {error && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-red-500/20 p-8 text-center">
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
        {!loading && result && answerModel?.astraBlocked && (
          <AstraNotice onContinueWithAstra={continueWithAstra} />
        )}
        {!loading && result && section && (
          <TabSystem
            result={result}
            loading={loading}
            sectionLabel={sectionName(section)}
            isNews={(plan?.news ?? 0) >= 0.5}
            cacheKey={storyKey}
          />
        )}
      </main>
    </div>
  );
}
