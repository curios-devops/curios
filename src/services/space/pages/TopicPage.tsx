// Topic hub — /topic/:slug. Lists public nodes tagged with a topic. Doubles as
// an SEO/GEO internal-linking hub (the "curiosity graph" by subject).

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listNodesByTopic } from '../nodePersistenceService';
import { topicFromSlug } from '../topicService';
import type { NodeRecord } from '../types';
import ContentCard from '../components/ContentCard';

export default function TopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const topic = useMemo(() => (slug ? topicFromSlug(slug) : ''), [slug]);
  const [nodes, setNodes] = useState<NodeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    (async () => {
      if (!topic) { setLoading(false); return; }
      const data = await listNodesByTopic(topic);
      if (!active) return;
      setNodes(data);
      setLoading(false);
      const title = topic.charAt(0).toUpperCase() + topic.slice(1);
      document.title = `${title} — CuriosAI`;
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', `Explanations and answers about ${topic} on CuriosAI.`);
    })();
    return () => { active = false; };
  }, [topic]);

  const heading = topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : 'Topic';

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ui-text-tertiary)' }}>Topic</p>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">{heading}</h1>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : nodes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No public explanations on this topic yet. <Link to="/" className="underline" style={{ color: 'var(--accent-primary)' }}>Ask a question</Link>.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((n) => (
            <ContentCard
              key={n.id}
              to={`/s/${n.share_slug}`}
              title={n.query}
              summary={n.short_summary || n.answer.slice(0, 140)}
              cover={n.cover_image || n.images[0]?.url}
            />
          ))}
        </div>
      )}
    </div>
  );
}
