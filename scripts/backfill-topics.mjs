// One-off backfill for curiosity_nodes:
//   1) Dedup duplicate nodes — keep the newest per (user_id, mode, query),
//      delete the rest (uses the service role key to bypass RLS).
//   2) Derive 2–4 topics for every remaining node that has none, via the
//      fetch-openai edge function, then patch the row.
//
// Usage:  node scripts/backfill-topics.mjs            (dry run — reports only)
//         node scripts/backfill-topics.mjs --apply    (performs deletes + updates)
//
// Reads SUPABASE_URL/anon/service + VITE_OPENAI_API_URL from .env.

import { readFileSync } from 'node:fs';

// Minimal .env loader (no dependency on dotenv).
const env = {};
for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const OPENAI_URL = env.VITE_OPENAI_API_URL;
const TOPICS_MODEL = env.VITE_TOPICS_LLM_MODEL || 'gpt-4.1-mini-2025-04-14';
const APPLY = process.argv.includes('--apply');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or service role key in .env');
  process.exit(1);
}

const svc = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

async function deriveTopics(query, answer) {
  if (!OPENAI_URL || !ANON_KEY) return [];
  const payload = {
    messages: [
      { role: 'system', content: 'You label content with topics. Return 2-4 broad, reusable topic tags (1-2 words each, lowercase, no punctuation) that best categorize the question and answer. Return JSON only.' },
      { role: 'user', content: `Question: ${query}\n\nAnswer (excerpt): ${(answer || '').slice(0, 1200)}\n\nReturn valid JSON only as {"topics": string[]}.` },
    ],
    model: TOPICS_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  };
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ prompt: JSON.stringify(payload) }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.text || data.content || data.output_text || '';
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
    const list = Array.isArray(parsed.topics) ? parsed.topics : [];
    const cleaned = list.map((t) => String(t).trim().toLowerCase()).filter((t) => t.length > 1 && t.length < 40);
    return [...new Set(cleaned)].slice(0, 4);
  } catch {
    return [];
  }
}

async function main() {
  const res = await svc('curiosity_nodes?select=id,user_id,mode,query,answer,topics,created_at,is_public,share_count,view_count&order=created_at.desc&limit=10000');
  const nodes = await res.json();
  console.log(`Fetched ${nodes.length} nodes. Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  // 1) Dedup per (user_id, mode, query). Keep the BEST one, never lose a shared
  //    node: prefer is_public, then engagement, then newest.
  const better = (a, b) => {
    if (!!b.is_public !== !!a.is_public) return b.is_public ? b : a;
    const eb = (b.share_count || 0) * 5 + (b.view_count || 0);
    const ea = (a.share_count || 0) * 5 + (a.view_count || 0);
    if (eb !== ea) return eb > ea ? b : a;
    return new Date(b.created_at) > new Date(a.created_at) ? b : a;
  };
  const seen = new Map();
  const toDelete = [];
  for (const n of nodes) {
    const key = `${n.user_id}|${n.mode}|${n.query}`;
    const cur = seen.get(key);
    if (!cur) { seen.set(key, n); continue; }
    const keep = better(cur, n);
    const drop = keep === cur ? n : cur;
    seen.set(key, keep);
    toDelete.push(drop.id);
  }
  console.log(`Duplicates to delete: ${toDelete.length}`);
  if (APPLY && toDelete.length) {
    // Delete in chunks via the `in` filter.
    for (let i = 0; i < toDelete.length; i += 50) {
      const chunk = toDelete.slice(i, i + 50);
      const r = await svc(`curiosity_nodes?id=in.(${chunk.join(',')})`, { method: 'DELETE' });
      if (!r.ok) console.error('Delete failed:', await r.text());
    }
    console.log(`Deleted ${toDelete.length} duplicates.`);
  }

  // 2) Backfill topics for survivors with none.
  const survivors = [...seen.values()].filter((n) => !Array.isArray(n.topics) || n.topics.length === 0);
  console.log(`Nodes needing topics: ${survivors.length}`);
  let filled = 0;
  for (const n of survivors) {
    const topics = await deriveTopics(n.query, n.answer);
    if (!topics.length) { console.log(`  · ${n.id} -> (none)`); continue; }
    console.log(`  · ${n.id} -> [${topics.join(', ')}]`);
    if (APPLY) {
      const r = await svc(`curiosity_nodes?id=eq.${n.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ topics }),
      });
      if (r.ok) filled++; else console.error('  update failed:', await r.text());
    }
  }
  console.log(APPLY ? `Filled topics for ${filled} nodes.` : 'Dry run complete — re-run with --apply to perform changes.');
}

main().catch((e) => { console.error(e); process.exit(1); });
