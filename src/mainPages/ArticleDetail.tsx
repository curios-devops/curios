import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';
import { useTheme } from '../components/theme/ThemeContext.tsx';
import { useAccentColor } from '../hooks/useAccentColor.ts';
import QueryBoxContainer from '../components/boxContainer/QueryBoxContainer.tsx';

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

  // Get article data from navigation state or reconstruct from ID
  const [article, setArticle] = useState<ArticleData | null>(
    location.state?.article || null
  );
  const [relatedArticles, setRelatedArticles] = useState<ArticleData[]>([]);

  useEffect(() => {
    // If we don't have article data, we could fetch it based on articleId
    // For now, we'll just show what we have from navigation state
    if (!article && articleId) {
      // TODO: Implement article fetching by ID if needed
      console.warn('Article data not found in navigation state');
    }
  }, [article, articleId]);

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
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
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
          <div className="flex items-center gap-3 mb-8">
            <span
              style={{
                color: 'var(--ui-text-tertiary)',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {article.source}
            </span>
            <span style={{ color: 'var(--ui-text-tertiary)', fontSize: '14px' }}>•</span>
            <span style={{ color: 'var(--ui-text-tertiary)', fontSize: '14px' }}>
              {article.date}
            </span>
          </div>

          {/* Description */}
          <p
            className="mb-8"
            style={{
              color: 'var(--ui-text-secondary)',
              fontSize: '18px',
              lineHeight: '1.7',
              letterSpacing: '-0.01em',
            }}
          >
            {article.snippet}
          </p>

          {/* Source Link Badge */}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-8 transition-all"
            style={{
              backgroundColor: 'var(--ui-bg-secondary)',
              border: '1px solid var(--ui-border-default)',
              color: accentColors.primary,
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = accentColors.primary;
              e.currentTarget.style.backgroundColor = `${accentColors.primary}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--ui-border-default)';
              e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
            }}
          >
            Read full article at {article.source}
          </a>

          {/* Main Image */}
          {article.thumbnail && (
            <div className="mb-12 rounded-xl overflow-hidden">
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
        </article>

        {/* Discover More Section */}
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
              Discover more
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedArticles.map((relatedArticle, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl cursor-pointer transition-all"
                  style={{
                    backgroundColor: 'var(--ui-bg-secondary)',
                    border: '1px solid var(--ui-border-default)',
                  }}
                  onClick={() => {
                    navigate(`/explore/${encodeURIComponent(relatedArticle.title)}`, {
                      state: { article: relatedArticle },
                    });
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = accentColors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ui-border-default)';
                  }}
                >
                  <h3
                    className="mb-2"
                    style={{
                      color: 'var(--ui-text-primary)',
                      fontSize: '16px',
                      fontWeight: '600',
                      lineHeight: '1.4',
                    }}
                  >
                    {relatedArticle.title}
                  </h3>
                  <p
                    style={{
                      color: 'var(--ui-text-secondary)',
                      fontSize: '14px',
                      lineHeight: '1.6',
                    }}
                  >
                    {relatedArticle.snippet.substring(0, 150)}...
                  </p>
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
