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

export default function Explore() {
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
      if (!dateString) return '';

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

      // Try to parse as a date string (handles ISO, UTC, and various formats)
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const now = new Date();
        const diffMs = now.getTime() - parsedDate.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        // If less than 24 hours, show hours ago
        if (diffHours < 24 && diffHours >= 0) {
          return `${Math.max(1, diffHours)}h ago`;
        }

        // Otherwise, show formatted date (always in user's locale)
        return parsedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC' // Ensure consistent formatting
        });
      }

      // Fallback: try to format as date anyway
      console.warn('[EXPLORE] Could not parse date:', dateString);
      return dateString;
    } catch (err) {
      console.error('[EXPLORE] Error parsing date:', dateString, err);
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

      const GOOGLE_NEWS_API_URL = import.meta.env.VITE_GOOGLE_NEWS_API_URL;
      if (!GOOGLE_NEWS_API_URL) {
        throw new Error('Google News API URL not configured. Please check environment variables.');
      }

      console.log('[EXPLORE] Fetching news from:', GOOGLE_NEWS_API_URL);

      // Add timeout to detect stuck requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const response = await fetch(GOOGLE_NEWS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: 'technology', // Default query - can be made dynamic later
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('[EXPLORE] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[EXPLORE] Error response:', errorText);

          if (response.status === 404) {
            throw new Error('Edge function not found. The google-news edge function needs to be deployed to Supabase.');
          }

          throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[EXPLORE] Result:', result);

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
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timeout. The edge function may not be deployed or is taking too long to respond.');
        }
        throw fetchError;
      }
    } catch (err) {
      console.error('[EXPLORE] Error fetching news:', err);
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
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1
            className="leading-tight transition-opacity duration-300 mb-3"
            style={{
              color: 'var(--ui-text-primary)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontWeight: '600',
              letterSpacing: '-0.02em',
              fontSize: 'clamp(28px, 4vw, 48px)',
            }}
          >
            Explore
          </h1>
          <p
            style={{
              color: 'var(--ui-text-secondary)',
              fontSize: '18px',
              fontWeight: '400',
              letterSpacing: '-0.01em',
            }}
          >
            Discover trending topics and latest news
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="w-16 h-16 border-4 rounded-full animate-spin mb-4"
              style={{
                borderColor: `${accentColors.primary}20`,
                borderTopColor: accentColors.primary,
                borderWidth: '4px',
              }}
            />
            <p
              style={{
                color: 'var(--ui-text-primary)',
                fontSize: '17px',
                fontWeight: '500',
              }}
            >
              Loading news...
            </p>
            <p
              style={{
                color: 'var(--ui-text-tertiary)',
                fontSize: '14px',
                marginTop: '8px',
              }}
            >
              Fetching latest articles
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

        {/* News Grid */}
        {!loading && !error && articles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
              <a
                key={index}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl overflow-hidden transition-all duration-200"
                style={{
                  backgroundColor: 'var(--ui-bg-secondary)',
                  border: '1px solid var(--ui-border-default)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = accentColors.primary;
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ui-border-default)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Featured Article (first one) - Image on Right */}
                {index === 0 && article.thumbnail ? (
                  <div className="flex flex-col sm:flex-row">
                    <div className="flex-1 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          style={{
                            color: 'var(--ui-text-tertiary)',
                            fontSize: '13px',
                            fontWeight: '500',
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
                      <h3
                        className="mb-3 group-hover:opacity-80 transition-opacity"
                        style={{
                          color: 'var(--ui-text-primary)',
                          fontSize: '20px',
                          fontWeight: '600',
                          lineHeight: '1.4',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {article.title}
                      </h3>
                      <p
                        style={{
                          color: 'var(--ui-text-secondary)',
                          fontSize: '15px',
                          lineHeight: '1.6',
                        }}
                      >
                        {article.snippet}
                      </p>
                    </div>
                    <div className="sm:w-48 sm:flex-shrink-0">
                      <img
                        src={article.thumbnail}
                        alt={article.title}
                        className="w-full h-48 sm:h-full object-cover"
                        style={{ minHeight: '200px' }}
                      />
                    </div>
                  </div>
                ) : (
                  /* Regular Articles - Image on Top */
                  <>
                    {article.thumbnail && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={article.thumbnail}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          style={{
                            color: 'var(--ui-text-tertiary)',
                            fontSize: '13px',
                            fontWeight: '500',
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
                      <h3
                        className="mb-3 group-hover:opacity-80 transition-opacity"
                        style={{
                          color: 'var(--ui-text-primary)',
                          fontSize: '18px',
                          fontWeight: '600',
                          lineHeight: '1.4',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {article.title}
                      </h3>
                      <p
                        style={{
                          color: 'var(--ui-text-secondary)',
                          fontSize: '14px',
                          lineHeight: '1.6',
                        }}
                      >
                        {article.snippet}
                      </p>
                    </div>
                  </>
                )}
              </a>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: 'var(--ui-text-secondary)', fontSize: '15px' }}>
              No news available at the moment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
