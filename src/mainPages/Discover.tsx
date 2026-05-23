import { useState, useEffect } from 'react';
import { useTheme } from '../components/theme/ThemeContext.tsx';
import { useAccentColor } from '../hooks/useAccentColor.ts';
import { useTranslation } from '../hooks/useTranslation.ts';

interface NewsArticle {
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  thumbnail?: string;
}

export default function Discover() {
  const { theme } = useTheme();
  const accentColors = useAccentColor();
  const { t } = useTranslation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Format date as relative time or formatted date
  const formatPublishedDate = (dateString: string): string => {
    try {
      // Parse various date formats from SerpAPI
      // Examples: "2 hours ago", "1 day ago", "May 23, 2024"
      const hoursAgoMatch = dateString.match(/(\d+)\s+hours?\s+ago/i);
      const daysAgoMatch = dateString.match(/(\d+)\s+days?\s+ago/i);
      const minutesAgoMatch = dateString.match(/(\d+)\s+minutes?\s+ago/i);

      // If already in relative format (hours ago)
      if (hoursAgoMatch) {
        const hours = parseInt(hoursAgoMatch[1]);
        return `${hours}h ago`;
      }

      // If minutes ago, convert to hours (round down, minimum 1 hour)
      if (minutesAgoMatch) {
        const minutes = parseInt(minutesAgoMatch[1]);
        const hours = Math.max(1, Math.floor(minutes / 60));
        return `${hours}h ago`;
      }

      // If days ago, calculate the actual date
      if (daysAgoMatch) {
        const daysAgo = parseInt(daysAgoMatch[1]);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      // Try to parse as a date string
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const now = new Date();
        const diffMs = now.getTime() - parsedDate.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        // If less than 24 hours, show hours ago
        if (diffHours < 24 && diffHours >= 0) {
          return `${Math.max(1, diffHours)}h ago`;
        }

        // Otherwise, show formatted date
        return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      // Fallback: return original string
      return dateString;
    } catch (err) {
      console.error('Error parsing date:', err);
      return dateString;
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);

      const SERP_API_URL = import.meta.env.VITE_SERP_API_URL;
      if (!SERP_API_URL) {
        throw new Error('SERP API URL not configured');
      }

      // Call the Supabase Edge Function instead of directly calling SerpAPI
      // Replace the reverse-image-search endpoint with google-news
      const googleNewsUrl = SERP_API_URL.replace('/reverse-image-search', '/google-news');

      const response = await fetch(googleNewsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'technology', // Default query - can be made dynamic later
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch news');
      }

      const newsArticles: NewsArticle[] = (result.data?.articles || []).map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        date: item.date || '',
        source: item.source || 'Unknown',
        thumbnail: item.thumbnail,
      }));

      setArticles(newsArticles);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen transition-colors duration-200"
      style={{
        backgroundColor: 'var(--ui-bg-primary)',
        color: 'var(--ui-text-primary)',
      }}
    >
      {/* Simplified full-width vertical feed */}
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="px-6 sm:px-8 pt-12 pb-8">
          <h1
            className="leading-tight transition-opacity duration-300 mb-2"
            style={{
              color: 'var(--ui-text-primary)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: '600',
              letterSpacing: '-0.03em',
              fontSize: 'clamp(32px, 5vw, 56px)',
            }}
          >
            Discover
          </h1>
          <p
            style={{
              color: 'var(--ui-text-secondary)',
              fontSize: '17px',
              fontWeight: '400',
              letterSpacing: '-0.01em',
            }}
          >
            AI-generated insights on what matters today
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="w-10 h-10 border-3 rounded-full animate-spin mb-4"
              style={{
                borderColor: `${accentColors.primary}30`,
                borderTopColor: accentColors.primary,
              }}
            />
            <p style={{ color: 'var(--ui-text-secondary)', fontSize: '15px' }}>
              Loading insights...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            className="mx-6 sm:mx-8 rounded-2xl p-6 mb-8"
            style={{
              backgroundColor: 'var(--ui-bg-secondary)',
              border: '1px solid var(--ui-border-default)',
            }}
          >
            <p style={{ color: 'var(--ui-text-primary)', fontSize: '15px' }}>
              {error}
            </p>
            <button
              onClick={fetchNews}
              className="mt-4 px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: accentColors.primary,
                color: 'var(--ui-text-on-accent)',
                fontSize: '14px',
                fontWeight: '500',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = accentColors.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = accentColors.primary;
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Vertical Feed - Edge-to-Edge Cards */}
        {!loading && !error && articles.length > 0 && (
          <div className="space-y-6">
            {articles.map((article, index) => (
              <a
                key={index}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden transition-all duration-300"
                style={{
                  backgroundColor: 'var(--ui-bg-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Full-bleed Image */}
                {article.thumbnail && (
                  <div className="w-full overflow-hidden" style={{ height: index === 0 ? '400px' : '280px' }}>
                    <img
                      src={article.thumbnail}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="px-6 sm:px-8 py-6">
                  {/* Metadata */}
                  <div className="flex items-center gap-2 mb-3">
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
                    <span
                      style={{
                        color: 'var(--ui-text-tertiary)',
                        fontSize: '13px',
                      }}
                    >
                      •
                    </span>
                    <span
                      style={{
                        color: 'var(--ui-text-tertiary)',
                        fontSize: '13px',
                      }}
                    >
                      {formatPublishedDate(article.date)}
                    </span>
                  </div>

                  {/* Headline - Large Typography */}
                  <h2
                    className="mb-4 group-hover:opacity-80 transition-opacity"
                    style={{
                      color: 'var(--ui-text-primary)',
                      fontSize: index === 0 ? '32px' : '24px',
                      fontWeight: '700',
                      lineHeight: '1.2',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {article.title}
                  </h2>

                  {/* Snippet */}
                  <p
                    style={{
                      color: 'var(--ui-text-secondary)',
                      fontSize: '16px',
                      lineHeight: '1.7',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {article.snippet}
                  </p>

                  {/* TODO: AI Hot Take Section (Future Enhancement) */}
                  {/*
                  <div
                    className="mt-6 pt-6"
                    style={{
                      borderTop: '1px solid var(--ui-border-subtle)',
                    }}
                  >
                    <div
                      className="mb-2"
                      style={{
                        color: accentColors.primary,
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      AI Insight
                    </div>
                    <p
                      style={{
                        color: 'var(--ui-text-primary)',
                        fontSize: '18px',
                        fontWeight: '600',
                        lineHeight: '1.5',
                        fontStyle: 'italic',
                      }}
                    >
                      "Future AI-generated hot take will appear here"
                    </p>
                  </div>
                  */}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-20 px-6">
            <p style={{ color: 'var(--ui-text-secondary)', fontSize: '15px' }}>
              No insights available at the moment
            </p>
          </div>
        )}

        {/* Bottom Padding */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}
