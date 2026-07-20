// FastSearch Results Page
// Displays fast search results with answer, horizontal media carousel, sources, and follow-ups

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight, Plus, Link2, Crown, FileText } from 'lucide-react';
import { executeFastSearchStreaming, executeDeepFastSearchStreaming } from '../controller';
import type { FastSearchResponse } from '../controller';
import { exportDeepSearchPdf } from '../utils/exportPdf';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import CustomMarkdown from '../../../components/CustomMarkdown';
import TopBar from '../../../components/results/TopBar';
import DynamicShareRow from '../../../components/share/DynamicShareRow';
import { formatTimeAgo } from '../../../utils/time';
import { saveNode, ensureShared, type SavedNodeRef } from '../../space/nodePersistenceService';
import SaveButton from '../../space/components/SaveButton';
import { resolveBuyIntent } from '../buyIntent';
import { searchAmazonProducts, type AmazonProduct } from '../../amazon-api';
import ProductCard from '../../../components/shopping/ProductCard';

// Sponsor/product carousel is capped here — legacy search capped at 4, this replaces
// it with up to 10 so the carousel has enough tiles to actually scroll.
const MAX_SPONSOR_PRODUCTS = 10;

// Helper to extract clean domain name from URL
function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    // Handle ccTLDs like .co.uk (last part length 2)
    if (parts.length >= 3 && parts[parts.length - 1].length === 2) {
      return parts[parts.length - 3];
    }
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return parts[0] || '';
  } catch {
    return '';
  }
}

export default function FastSearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const wantsDeep = searchParams.get('deep') === '1';
  // Auto mode already confirmed buy intent before routing here — trust it and skip
  // re-detecting. Absent for an explicitly-selected Search (or a direct/shared URL),
  // which self-detects below, in parallel with the main search workflow.
  const buyIntentConfirmed = searchParams.get('buy') === '1';

  const { requestProAccess } = useProCredits();

  const [effectiveDeep, setEffectiveDeep] = useState(false);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const answerCardRef = useRef<HTMLDivElement | null>(null);
  const runKeyRef = useRef<string>('');

  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FastSearchResponse | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [showSearching, setShowSearching] = useState(true);
  const [foundSources, setFoundSources] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [frozenSourcesForAnimation, setFrozenSourcesForAnimation] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [images, setImages] = useState<Array<{ url: string; title: string; source: string }>>([]);
  // Sponsor carousel: populated only when buy intent is detected (Auto's `&buy=1` flag,
  // or this page's own parallel detection for an explicitly-selected Search). Replaces
  // the image carousel in place — the underlying image search still runs regardless.
  const [sponsorProducts, setSponsorProducts] = useState<AmazonProduct[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('answer');
  // The persisted curiosity node (authenticated only). Drives the Share snapshot.
  const [savedNode, setSavedNode] = useState<SavedNodeRef | null>(null);

  // Memoize citations separately to prevent recreation on every render
  const citations = useMemo(() => {
    return foundSources.map(source => {
      const hostname = (() => {
        try {
          return new URL(source.url).hostname.replace(/^www\./, '');
        } catch {
          return '';
        }
      })();
      const parts = hostname.split('.');

      // Extract siteName: prefer first part (subdomain like 'azure') over root domain
      // Examples: azure.microsoft.com -> azure, wikipedia.org -> wikipedia
      const siteName = parts[0] || '';

      return {
        url: source.url,
        title: source.title,
        siteName: siteName,
        snippet: source.snippet
      };
    });
  }, [foundSources]);

  // Process answer text separately
  const processedAnswer = useMemo(() => {
    if (!streamingAnswer) return '';

    let text = streamingAnswer;

    // Step 1: Convert [text](url) to [sitename] (for any markdown links)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
      try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        const parts = hostname.split('.');
        const siteName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        return `[${siteName}]`;
      } catch {
        return linkText;
      }
    });

    // Step 2: Remove parenthetical citations only if they look like citations
    // Match: (sitename), (sitename +N), (sitename(url))
    text = text.replace(/\s*\(([a-z0-9]+)(\s*\+\d+)?(\([^)]+\))?\)/gi, '');

    // Step 3: Remove horizontal rules (---) but preserve markdown headings
    // Only remove lines that are ONLY dashes/hyphens with optional whitespace
    text = text.replace(/^\s*[-–—]{3,}\s*$/gm, '');

    // Step 4: Remove unwanted sections
    // Remove "Follow-up Questions" section (these are shown separately in the UI)
    text = text.replace(/\n\s*##?\s*Follow-?up\s+(?:Questions?|Topics?)[:\s]*[\s\S]*$/i, '');

    // Remove "Sources" section variations
    text = text.replace(/\n\s*##?\s*Sources?\s*\(from provided search results\)[:\s]*[\s\S]*$/i, '');
    text = text.replace(/\n\s*##?\s*Selected [Ss]ources[:\s]*[\s\S]*$/i, '');
    text = text.replace(/\n\s*##?\s*Where to [Rr]ead [Mm]ore[:\s]*[\s\S]*$/i, '');
    text = text.replace(/\n\s*##?\s*Quick [Rr]eference [Ll]inks[:\s]*[\s\S]*$/i, '');
    text = text.replace(/\n\s*Sources?:[:\s]*[\s\S]*$/i, '');

    // Clean up encoding issues
    text = text.replace(/�/g, '');

    return text;
  }, [streamingAnswer]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Update time ago
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [searchStartTime]);

  // Cycle through source names while searching — Claude-style: each full name
  // overwrites the previous with a cross-fade (the .fs-shimmer span keys off the
  // index), no letter-by-letter typing/erasing.
  useEffect(() => {
    if (frozenSourcesForAnimation.length === 0 || !showSearching) {
      return;
    }
    const id = setInterval(() => {
      setCurrentSourceIndex((prev) => (prev + 1) % frozenSourcesForAnimation.length);
    }, 1500);
    return () => clearInterval(id);
  }, [frozenSourcesForAnimation.length, showSearching]);

  // Execute search with streaming
  useEffect(() => {
    if (!query.trim()) {
      setError('Please enter a search query');
      setIsLoading(false);
      return;
    }

    // Guard against duplicate execution (StrictMode / re-renders) to avoid
    // firing the same search twice.
    const runKey = `${query}|${wantsDeep}`;
    if (runKeyRef.current === runKey) return;
    runKeyRef.current = runKey;

    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setStreamingAnswer('');
        setShowSearching(true);
        setFoundSources([]);
        setFrozenSourcesForAnimation([]);
        setHeaderImage(null);
        setSponsorProducts([]);

        // Sponsor carousel (buy intent): fire-and-forget, never blocks the search/answer.
        // Auto already confirmed it (`&buy=1`) — go straight to fetching products. Otherwise
        // (explicit Search mode, direct/shared URL) detect it here, in parallel with the
        // search workflow below, exactly like the legacy search's shopping-intent check.
        const fetchSponsorProducts = () =>
          searchAmazonProducts(query, MAX_SPONSOR_PRODUCTS)
            .then((result) => { if (result.success) setSponsorProducts(result.products); })
            .catch(() => undefined);

        if (buyIntentConfirmed) {
          void fetchSponsorProducts();
        } else {
          void resolveBuyIntent(query).then((result) => {
            if (result.isBuyIntent) void fetchSponsorProducts();
          });
        }

        const locale = navigator.language.split('-')[0] || 'en';

        // No gating here: Pro access is gated (and the credit consumed) by the
        // Ask Deeper toggle. Entering search just runs the requested tier.
        const deep = wantsDeep;
        setEffectiveDeep(deep);

        let isFirstChunk = true;
        let fullAnswer = '';
        const onChunk = (chunk: string) => {
          // Hide searching animation on first chunk - stream starts immediately
          if (isFirstChunk) {
            setShowSearching(false);
            isFirstChunk = false;
          }
          fullAnswer += chunk;
          setStreamingAnswer(prev => prev + chunk);
        };
        const onSources = (sources: Array<{ title: string; url: string; snippet: string }>) => {
          setFoundSources(sources);
          if (frozenSourcesForAnimation.length === 0) {
            setFrozenSourcesForAnimation(sources);
          }
        };
        const onImagesFound = (imgs: Array<{ url: string; title: string; source: string }>) => {
          setImages(imgs);
        };

        const response = deep
          ? await executeDeepFastSearchStreaming(
              { query, locale },
              onChunk,
              onSources,
              onImagesFound,
              (url: string) => setHeaderImage(url)
            )
          : await executeFastSearchStreaming(
              { query, locale },
              onChunk,
              onSources,
              onImagesFound
            );

        // Set follow-ups AFTER streaming completes
        if (response.followUps && response.followUps.length > 0) {
          setFollowUpQuestions(response.followUps);
        }

        setResults({
          answer: '',
          sources: response.sources,
          images: response.images,
          videos: response.videos,
          followUps: response.followUps
        });
        setIsLoading(false);

        // Auto-save this Q&A as a curiosity node (authenticated users only;
        // saveNode is a no-op for guests). The persisted snapshot is the single
        // source of truth behind the Share page, Space, and Feed.
        const coverImage = (response as { headerImage?: string }).headerImage || response.images[0]?.url;
        saveNode({
          mode: 'fast_search',
          query,
          answer: fullAnswer,
          sources: response.sources,
          images: response.images,
          videos: response.videos,
          followUps: response.followUps,
          coverImage,
        }).then((ref) => {
          if (ref) setSavedNode(ref);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setIsLoading(false);
      }
    };

    fetchResults();
    // Only re-run when the query or requested tier changes; other deps (navigate,
    // state setters) are stable/intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, wantsDeep]);

  // Toggle "Ask Deeper" (a Pro feature). This is the single gate: turning it ON
  // consumes a Pro Credit via requestProAccess; if the user is out of access it
  // raises the subscription modal (register/upgrade/quota) and we don't navigate.
  const handleToggleDeep = async () => {
    const q = encodeURIComponent(query);
    if (wantsDeep) {
      navigate(`/fast-search?q=${q}`);
      return;
    }
    const allowed = await requestProAccess();
    if (!allowed) return;
    navigate(`/fast-search?q=${q}&deep=1`);
  };

  const handleExportPdf = async () => {
    if (!answerCardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await exportDeepSearchPdf(answerCardRef.current, query);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFollowUpClick = (question: string) => {
    navigate(`/fast-search?q=${encodeURIComponent(question)}${effectiveDeep ? '&deep=1' : ''}`);
  };

  // In Ask Deeper the generated header image leads the carousel as a wide,
  // featured hero — and is what we share to social. Otherwise the carousel is
  // just the retrieved images.
  const hasFeaturedImage = effectiveDeep && !!headerImage;
  const carouselImages = hasFeaturedImage
    ? [{ url: headerImage as string, title: query, source: 'CuriosAI' }, ...images.filter((img) => img.url !== headerImage)]
    : images;

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] fast-search-page overflow-x-hidden">
      <style>{`
        .fast-search-page nav button:first-child {
          display: none;
        }
        /* Claude-style shimmering loading text that cross-fades between phrases. */
        @keyframes fsShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .fs-shimmer {
          background: linear-gradient(90deg,
            var(--ui-text-secondary, #9ca3af) 0%,
            var(--accent-primary) 50%,
            var(--ui-text-secondary, #9ca3af) 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: fsShimmer 2.4s linear infinite, fsFadeIn 0.45s ease;
        }
        /* Answer body: a touch smaller, tighter spacing, accent bullets, and
           less indent so it uses the full width (especially on mobile). Scoped
           here so the shared CustomMarkdown is untouched. */
        .fs-answer-body p,
        .fs-answer-body li {
          font-size: 0.9375rem;
          line-height: 1.55;
        }
        .fs-answer-body p { margin-bottom: 0.5rem; }
        .fs-answer-body ul,
        .fs-answer-body ol { margin-bottom: 0.5rem; padding-left: 0.25rem; }
        .fs-answer-body li { margin-bottom: 0.15rem; }
        .fs-answer-body li::marker { color: var(--accent-primary); }
        .fs-answer-body h2 { font-size: 1.0625rem; margin-top: 0.85rem; margin-bottom: 0.4rem; }
        .fs-answer-body h3 { font-size: 1rem; margin-top: 0.7rem; margin-bottom: 0.35rem; }
      `}</style>
      <TopBar
        query={query}
        timeAgo={timeAgo}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        rightSlot={
          <button
            type="button"
            onClick={handleToggleDeep}
            title="Deeper research with more sources, context, and visuals"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-all cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-primary)',
              boxShadow: wantsDeep
                ? '0 0 0 3px color-mix(in srgb, var(--accent-primary) 30%, transparent)'
                : undefined,
            }}
          >
            <Crown size={16} />
            <span>Ask Deeper</span>
          </button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading indicator - animated sources counter */}
        {showSearching && activeTab === 'answer' && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            {frozenSourcesForAnimation.length === 0 ? (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-primary)' }} />
                <span>Searching trusted sources...</span>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-3 h-3 rounded-full animate-ping absolute" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.4 }}></div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0 fs-shimmer">Analyzing</span>
                    <span
                      key={currentSourceIndex}
                      className="text-base font-medium truncate fs-shimmer"
                    >
                      {frozenSourcesForAnimation[currentSourceIndex % frozenSourcesForAnimation.length]?.title?.slice(0, 40) || ''}
                    </span>
                  </div>
                </div>

                {/* Frozen favicons - rendered once, no re-renders */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center">
                    {frozenSourcesForAnimation.slice(0, 3).map((source, index) => {
                      try {
                        const domain = new URL(source.url).hostname.replace('www.', '');
                        return (
                          <div
                            key={source.url}
                            className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden"
                            style={{ marginLeft: index > 0 ? '-8px' : '0', zIndex: 3 - index }}
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                              alt=""
                              className="w-4 h-4"
                            />
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    +{frozenSourcesForAnimation.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ask Deeper: generating the contextual hero image (copied from legacy
            search's "Generating answer..." dot) so the user waits for it. */}
        {effectiveDeep && !showSearching && isLoading && activeTab === 'answer' && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full animate-ping flex-shrink-0" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
            <GeneratingPhrases />
          </div>
        )}

        {/* Images at top - between tabs and content. Buy intent replaces it with the
            sponsor products carousel (Amazon) — same slot, same tab. */}
        {!isLoading && activeTab === 'answer' && (
          sponsorProducts.length > 0 ? (
            <ProductsCarousel products={sponsorProducts} />
          ) : carouselImages.length > 0 && (
            <ImagesCarousel images={carouselImages} featuredFirst={hasFeaturedImage} />
          )
        )}

        {/* Dynamic share row - between carousel and outline (blueprint placement).
            Export PDF rides along as a trailing action, but only in Ask Deeper mode. */}
        {!showSearching && streamingAnswer && activeTab === 'answer' && (
          <DynamicShareRow
            serviceType="fast_search"
            onShare={savedNode ? () => ensureShared(savedNode.id) : undefined}
            payload={{
              title: query,
              description: streamingAnswer.slice(0, 200),
              text: streamingAnswer.slice(0, 100),
              imageUrls: carouselImages.map((img) => img.url),
              deepLink: savedNode
                ? `https://curiosai.com/s/${savedNode.shareSlug}`
                : window.location.href,
            }}
            trailing={
              <>
                {savedNode && <SaveButton nodeId={savedNode.id} />}
                {effectiveDeep && (
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    title="Export PDF"
                    aria-label="Export PDF"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-[#222222] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-900 dark:text-white transition-colors disabled:opacity-60"
                  >
                    <FileText size={18} />
                  </button>
                )}
              </>
            }
          />
        )}

        {/* Overview Tab - AI Overview with follow-ups */}
        {activeTab === 'answer' && (
          <>
            {/* AI Overview - appears when streaming starts */}
            {!showSearching && (
              <div ref={answerCardRef} className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
                    <h2 className="text-xl font-medium text-gray-900 dark:text-white">AI Overview</h2>
                  </div>

                  {/* Source count with icons */}
                  {foundSources.length > 0 && (
                    <div className="flex items-center gap-2">
                      {/* Stacked favicons - show first 3 overlapping */}
                      <div className="flex items-center">
                        {foundSources.slice(0, 3).map((source, index) => {
                          const domain = (() => {
                            try {
                              return new URL(source.url).hostname.replace('www.', '');
                            } catch {
                              return '';
                            }
                          })();
                          return (
                            <div
                              key={index}
                              className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden"
                              style={{ marginLeft: index > 0 ? '-8px' : '0', zIndex: 3 - index }}
                            >
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                                alt=""
                                className="w-4 h-4"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* +N badge showing total sources */}
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        +{foundSources.length}
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="fs-answer-body prose dark:prose-invert max-w-none break-words [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_table]:block [&_table]:overflow-x-auto">
                    <CustomMarkdown citations={citations}>
                      {processedAnswer}
                    </CustomMarkdown>
                    {isLoading && (
                      <span className="inline-block w-2 h-4 ml-1 animate-pulse align-middle" style={{ backgroundColor: 'var(--accent-primary)' }}></span>
                    )}
                  </div>
                </div>

                {/* Quick Links Section - show first 4 sources */}
                {!isLoading && foundSources.length > 0 && (
                  <div className="p-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                        <Link2 size={12} style={{ color: 'var(--accent-primary)' }} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Quick Links</h3>
                    </div>

                    {/* 4-column grid of source cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {foundSources.slice(0, 4).map((source, index) => {
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
                            key={index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 bg-white dark:bg-gray-800 hover:shadow-md overflow-hidden cursor-pointer"
                          >
                            <div className="p-3 flex-1 flex flex-col">
                              {/* Favicon + Domain */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex-shrink-0 w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${fullDomain}&sz=32`}
                                    alt=""
                                    className="w-3 h-3"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                                  {cleanDomain}
                                </span>
                              </div>

                              {/* Title */}
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 transition-colors group-hover:text-[var(--accent-primary)]">
                                {source.title}
                              </h4>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Follow-up Questions - only after streaming completes */}
            {!isLoading && followUpQuestions.length > 0 && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                <div className="w-2.5 h-2.5 grid grid-cols-2 gap-0.5">
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Follow-Ups</h3>
            </div>

            <div className="space-y-0">
              {followUpQuestions.map((question, index) => (
                <div key={index}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between py-2.5 px-0 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                    onClick={() => handleFollowUpClick(question)}
                    onMouseEnter={(e) => {
                      const span = e.currentTarget.querySelector('.question-text') as HTMLElement;
                      const circle = e.currentTarget.querySelector('.plus-circle') as HTMLElement;
                      if (span) span.style.color = 'var(--accent-primary)';
                      if (circle) {
                        circle.style.borderColor = 'var(--accent-primary)';
                        circle.style.backgroundColor = 'var(--accent-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const span = e.currentTarget.querySelector('.question-text') as HTMLElement;
                      const circle = e.currentTarget.querySelector('.plus-circle') as HTMLElement;
                      if (span) span.style.color = '';
                      if (circle) {
                        circle.style.borderColor = '';
                        circle.style.backgroundColor = '';
                      }
                    }}
                  >
                    <span className="question-text text-sm text-gray-700 dark:text-gray-300 transition-colors leading-relaxed">
                      {question}
                    </span>
                    <div className="plus-circle flex-shrink-0 w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center transition-colors ml-3">
                      <Plus size={10} className="text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                  </button>
                  {index < followUpQuestions.length - 1 && (
                    <div className="border-b border-gray-200 dark:border-gray-800"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
            )}
          </>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && images.length > 0 && (
          <ImagesGrid images={images} />
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && results?.videos && results.videos.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Videos</h3>
            <div className="grid grid-cols-1 gap-4">
              {results.videos.map((video, index) => (
                <a
                  key={index}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-[#0a0a0a]"
                >
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt={video.title} className="w-32 h-20 object-cover rounded flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white break-words">{video.title}</h4>
                    {video.source && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{video.source}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Sources Tab - use real search results from Tavily/Brave */}
        {activeTab === 'news' && results?.sources && results.sources.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white px-1">Sources</h3>
            <div className="grid grid-cols-1 gap-3">
              {results.sources.map((source, index) => {
                const extractDomain = (url: string) => {
                  try {
                    return new URL(url).hostname.replace('www.', '');
                  } catch {
                    return 'Unknown';
                  }
                };

                return (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-[#0a0a0a]"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${extractDomain(source.url)}&sz=32`}
                        alt=""
                        className="w-4 h-4"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">{source.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{extractDomain(source.url)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{source.snippet}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Images Carousel Component
// Rotating, shimmering loading phrases (Claude-style): each phrase overwrites the
// previous with a cross-fade while the contextual image is generated.
const GENERATING_PHRASES = [
  'Generating image',
  'Setting the scene',
  'Composing the shot',
  'Polishing details',
  'Refining the light',
  'Adding final touches',
  'Bringing it to life',
  'Almost there',
  'One last tweak',
  'Finishing up',
];

function GeneratingPhrases() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % GENERATING_PHRASES.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  // key={index} remounts the span so the fade-in (overwrite) replays each phrase.
  return (
    <span key={index} className="fs-shimmer font-medium">
      {GENERATING_PHRASES[index]}…
    </span>
  );
}

function ImagesCarousel({ images, featuredFirst = false }: { images: Array<{ url: string; title: string; source: string }>; featuredFirst?: boolean }) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = 300;
    const newPosition = direction === 'left'
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount;

    containerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  const handleImageLoad = (index: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions(prev => new Map(prev).set(index, { width: img.naturalWidth, height: img.naturalHeight }));
  };

  const getImageClass = (index: number) => {
    // Featured hero (Ask Deeper generated image) leads the carousel ~2 tiles wide.
    if (featuredFirst && index === 0) return 'w-80 h-40';

    const dims = imageDimensions.get(index);
    if (!dims) return 'w-48 h-40'; // Default landscape while loading

    const aspectRatio = dims.width / dims.height;
    const fixedHeight = 'h-40'; // Same height for all: 160px

    if (aspectRatio > 1.3) {
      // Landscape - wider
      return `w-56 ${fixedHeight}`;
    } else if (aspectRatio < 0.7) {
      // Portrait - narrower
      return `w-28 ${fixedHeight}`;
    } else {
      // Square
      return `w-40 ${fixedHeight}`;
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative group">
        {/* Left scroll button */}
        {scrollPosition > 0 && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}

        {/* Carousel container */}
        <div
          ref={containerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory items-center"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {images.map((image, index) => (
            <a
              key={index}
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 snap-start"
            >
              <div className={`${getImageClass(index)} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors`}>
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onLoad={(e) => handleImageLoad(index, e)}
                  onError={(e) => {
                    // Broken image (e.g. SerpAPI full-res 404/hotlink-blocked):
                    // hide the whole tile so there's no empty box.
                    const tile = e.currentTarget.closest('a');
                    if (tile) (tile as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </a>
          ))}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
}

// Sponsor Products Carousel — same horizontal scroll-snap shell as ImagesCarousel,
// each tile is the shared ProductCard (image, price badge, rating, "View on Amazon").
function ProductsCarousel({ products }: { products: AmazonProduct[] }) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = 300;
    const newPosition = direction === 'left'
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount;

    containerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        <span>Sponsored</span>
      </div>
      <div className="relative group">
        {scrollPosition > 0 && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}

        <div
          ref={containerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory items-stretch"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div key={product.asin} className="flex-shrink-0 snap-start w-44">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      <div className="text-[11px] text-gray-400 dark:text-gray-500">
        Products are fetched from Amazon. Prices and availability may vary.
      </div>
    </div>
  );
}

// Images Grid Component
function ImagesGrid({ images }: { images: Array<{ url: string; title: string; source: string }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {images.map((image, index) => (
        <a
          key={index}
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
            <img
              src={image.url}
              alt={image.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const tile = e.currentTarget.closest('a');
                if (tile) (tile as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </a>
      ))}
    </div>
  );
}
