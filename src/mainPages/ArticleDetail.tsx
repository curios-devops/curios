import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Share2, ExternalLink } from 'lucide-react';
import { useTheme } from '../components/theme/ThemeContext.tsx';
import { useAccentColor } from '../hooks/useAccentColor.ts';
import QueryBoxContainer from '../components/boxContainer/QueryBoxContainer.tsx';
import CustomMarkdown from '../components/CustomMarkdown.tsx';
import { generateArticleContentStreaming, type ArticleSource } from '../services/explore/articleService';
import type { CitationInfo } from '../commonApp/types';

interface ArticleData {
  title: string;
  snippet: string;
  link: string;
  source: string;
  date: string;
  thumbnail?: string;
}

export default function ArticleDetail() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const accentColors = useAccentColor();

  const [article, setArticle] = useState<ArticleData | null>(
    location.state?.article || null
  );
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [sources, setSources] = useState<ArticleSource[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleData[]>(
    location.state?.relatedArticles || []
  );


  // CRITICAL FIX: Memoize citations separately to prevent re-creation on tooltip state changes
  // If citations is recreated, CustomMarkdown gets new prop → re-parses → remounts MultipleCitations → loses event handlers
  const citations = useMemo(() => {
    if (sources.length === 0) return [];

    return sources.map(source => {
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
  }, [sources]); // ONLY depends on sources - stable during streaming AND after tooltip state changes

  // Process answer text separately - can update during streaming without affecting citations
  const processedAnswer = useMemo(() => {
    if (!streamingContent) return '';

    let text = streamingContent;

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
    text = text.replace(/\n\s*##?\s*Selected [Ss]ources.*$/s, '');
    text = text.replace(/\*\*Selected [Ss]ources\*\*.*$/s, '');
    text = text.replace(/\n\s*##?\s*Where to [Rr]ead [Mm]ore.*$/s, '');
    text = text.replace(/\*\*Where to [Rr]ead [Mm]ore.*$/s, '');
    text = text.replace(/\n\s*##?\s*Quick [Rr]eference [Ll]inks.*$/s, '');
    text = text.replace(/\*\*Quick [Rr]eference [Ll]inks\*\*.*$/s, '');
    text = text.replace(/\n\s*Sources:\s*.*$/s, '');
    text = text.replace(/\*\*Sources:\*\*\s*.*$/s, '');

    // Clean up encoding issues
    text = text.replace(/�/g, '');

    return text;
  }, [streamingContent]); // ONLY depends on streamingContent - citations are separate

  useEffect(() => {
    if (article) {
      loadArticleContent();
    } else if (articleId) {
      console.warn('[ARTICLE DETAIL] Article data not found in navigation state');
      setIsGenerating(false);
    }
  }, [article?.title]); // FIXED: Use primitive value, not object reference

  const loadArticleContent = async () => {
    if (!article) return;

    try {
      setError(null);
      setStreamingContent('');
      setIsGenerating(true);

      let isFirstChunk = true;
      const returnedSources = await generateArticleContentStreaming(
        article.title,
        article.snippet,
        article.link,
        (chunk: string) => {
          // On first chunk, stop showing "generating" state
          if (isFirstChunk) {
            setIsGenerating(false);
            isFirstChunk = false;
          }
          setStreamingContent(prev => {
            const newContent = prev + chunk;
            return newContent;
          });
        }
      );

      setSources(returnedSources);
    } catch (err) {
      console.error('[ARTICLE DETAIL] Error loading content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load article content');
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: article?.title || 'Article from CuriosAI',
      text: article?.snippet || '',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('[ARTICLE DETAIL] Error sharing:', err);
    }
  };

  if (!article) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: 'var(--ui-bg-primary)',
          color: 'var(--ui-text-primary)',
        }}
      >
        <p>Article not found</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-200"
      style={{
        backgroundColor: 'var(--ui-bg-primary)',
        color: 'var(--ui-text-primary)',
      }}
    >
      <div className="max-w-[900px] mx-auto px-6 sm:px-8 py-8">
        {/* Header with Back and Share */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/explore')}
            className="flex items-center gap-2 transition-colors"
            style={{ color: 'var(--ui-text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = accentColors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ui-text-secondary)';
            }}
          >
            <ArrowLeft size={20} />
            <span style={{ fontSize: '15px', fontWeight: '500' }}>Back to Discover</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: 'var(--ui-bg-secondary)',
              border: '1px solid var(--ui-border-default)',
              color: 'var(--ui-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = accentColors.primary;
              e.currentTarget.style.color = accentColors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--ui-border-default)';
              e.currentTarget.style.color = 'var(--ui-text-secondary)';
            }}
          >
            <Share2 size={18} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Share</span>
          </button>
        </div>

        {/* Separator */}
        <div
          className="mb-8"
          style={{
            height: '1px',
            backgroundColor: 'var(--ui-border-subtle)',
          }}
        />

        {/* Article Content */}
        <article>
          {/* Title */}
          <h1
            className="mb-6"
            style={{
              color: 'var(--ui-text-primary)',
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: '700',
              lineHeight: '1.2',
              letterSpacing: '-0.02em',
            }}
          >
            {article.title}
          </h1>

          {/* Metadata */}
          <div className="flex items-center gap-2 mb-8">
            <span
              style={{
                color: 'var(--ui-text-tertiary)',
                fontSize: '13px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {article.source}
            </span>
            <span style={{ color: 'var(--ui-text-tertiary)', fontSize: '13px' }}>•</span>
            <span style={{ color: 'var(--ui-text-tertiary)', fontSize: '13px' }}>
              {article.date}
            </span>
          </div>

          {/* Main Image */}
          {article.thumbnail && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img
                src={article.thumbnail}
                alt={article.title}
                className="w-full h-auto"
                style={{ maxHeight: '500px', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Generating State - Shows before streaming starts */}
          {isGenerating && !streamingContent && (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className="w-12 h-12 border-4 rounded-full animate-spin mb-4"
                style={{
                  borderColor: `${accentColors.primary}20`,
                  borderTopColor: accentColors.primary,
                }}
              />
              <p style={{ color: 'var(--ui-text-secondary)', fontSize: '15px' }}>
                Generating in-depth analysis...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div
              className="rounded-xl p-6 mb-8"
              style={{
                backgroundColor: 'var(--ui-bg-secondary)',
                border: '1px solid var(--ui-border-default)',
              }}
            >
              <p style={{ color: 'var(--ui-text-primary)', fontSize: '15px' }}>
                {error}
              </p>
              <button
                onClick={loadArticleContent}
                className="mt-4 px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: accentColors.primary,
                  color: 'var(--ui-text-on-accent)',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Source Link Badges - REMOVED: Citations now handled inline via MultipleCitations component */}

          {/* Streaming AI Content */}
          {streamingContent && (
            <div className="prose prose-lg max-w-none">
              <CustomMarkdown citations={citations}>{processedAnswer}</CustomMarkdown>
            </div>
          )}
        </article>

        {/* Keep Exploring Section */}
        {relatedArticles.length > 0 && (
          <div className="mt-16">
            <h2
              className="mb-6"
              style={{
                color: 'var(--ui-text-primary)',
                fontSize: '24px',
                fontWeight: '600',
                letterSpacing: '-0.01em',
              }}
            >
              Keep exploring...
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedArticles.map((relatedArticle, index) => (
                <div
                  key={index}
                  className="group rounded-xl overflow-hidden cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--ui-bg-secondary)',
                    border: '1px solid var(--ui-border-default)',
                  }}
                  onClick={() => {
                    navigate(`/explore/${encodeURIComponent(relatedArticle.title)}`, {
                      state: { article: relatedArticle, relatedArticles },
                    });
                    window.scrollTo(0, 0);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = accentColors.primary;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ui-border-default)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {relatedArticle.thumbnail && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={relatedArticle.thumbnail}
                        alt={relatedArticle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const container = e.currentTarget.parentElement;
                          if (container) container.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3
                      className="mb-2 line-clamp-2"
                      style={{
                        color: 'var(--ui-text-primary)',
                        fontSize: '15px',
                        fontWeight: '600',
                        lineHeight: '1.4',
                      }}
                    >
                      {relatedArticle.title}
                    </h3>
                    <p
                      className="line-clamp-2"
                      style={{
                        color: 'var(--ui-text-secondary)',
                        fontSize: '13px',
                        lineHeight: '1.5',
                      }}
                    >
                      {relatedArticle.snippet}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Follow-up Search Box */}
        <div className="mt-16">
          <QueryBoxContainer placeholderText="Ask follow-up..." />
        </div>
      </div>
    </div>
  );
}
