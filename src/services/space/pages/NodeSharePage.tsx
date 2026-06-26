// Public Share snapshot — /s/:slug.
// Renders a persisted curiosity node straight from the DB. The agent is NEVER
// called here: a Share is an immutable snapshot of the original answer.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import CustomMarkdown from '../../../components/CustomMarkdown';
import DynamicShareRow from '../../../components/share/DynamicShareRow';
import SaveButton from '../components/SaveButton';
import { getNodeBySlug, incrementNodeView } from '../nodePersistenceService';
import type { NodeRecord } from '../types';

export default function NodeSharePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [node, setNode] = useState<NodeRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    (async () => {
      if (!slug) {
        setLoading(false);
        return;
      }
      const record = await getNodeBySlug(slug);
      if (!active) return;
      setNode(record);
      setLoading(false);
      if (record) {
        incrementNodeView(record.id);
        // Set per-page title/description for JS-rendering crawlers (Googlebot) and tabs.
        document.title = `${record.query} — CuriosAI`;
        const desc = (record.short_summary || record.answer || '').replace(/[#*`>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'description');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', desc);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  // Citations for inline markdown tooltips (same shape FastSearch builds).
  const citations = useMemo(() => {
    if (!node) return [];
    return node.sources.map((source) => {
      let siteName = '';
      try {
        siteName = new URL(source.url).hostname.replace(/^www\./, '').split('.')[0] || '';
      } catch { /* leave blank */ }
      return { url: source.url, title: source.title, siteName, snippet: source.snippet };
    });
  }, [node]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ backgroundColor: 'var(--background)' }}>
        <h1 className="text-2xl font-medium" style={{ color: 'var(--ui-text-primary)' }}>This page isn't available</h1>
        <p style={{ color: 'var(--ui-text-muted)' }}>The shared answer may have been removed or made private.</p>
        <Link to="/" className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>
          Go home
        </Link>
      </div>
    );
  }

  const cover = node.cover_image || node.images[0]?.url;

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white break-words">
          {node.query}
        </h1>

        {cover && (
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <img src={cover} alt={node.query} className="w-full max-h-80 object-cover" />
          </div>
        )}

        <DynamicShareRow
          serviceType="fast_search"
          payload={{
            title: node.query,
            description: (node.short_summary || node.answer).slice(0, 200),
            imageUrls: cover ? [cover] : [],
            deepLink: `https://curiosai.com/s/${node.share_slug}`,
          }}
          trailing={<SaveButton nodeId={node.id} />}
        />

        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-gray-200 dark:border-gray-800">
            <Sparkles className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
            <h2 className="text-xl font-medium text-gray-900 dark:text-white">AI Overview</h2>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="prose dark:prose-invert max-w-none break-words">
              <CustomMarkdown citations={citations}>{node.answer}</CustomMarkdown>
            </div>
          </div>

          {node.sources.length > 0 && (
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sources</h3>
              <div className="grid grid-cols-1 gap-3">
                {node.sources.map((source, i) => {
                  let domain = '';
                  try { domain = new URL(source.url).hostname.replace('www.', ''); } catch { /* */ }
                  return (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">{source.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{domain}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{source.snippet}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="text-center pt-2">
          <Link
            to={`/?q=${encodeURIComponent(node.query)}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
          >
            Ask your own question
          </Link>
        </div>
      </div>
    </div>
  );
}
