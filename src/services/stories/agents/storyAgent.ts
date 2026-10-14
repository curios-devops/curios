// StoryAgent — Magazine (route /stories-results) pipeline.
//
// 1. Search angles: the user's question plus two "perspective" and two "counterpoint"
//    questions drafted by the model (templates as fallback).
// 2. Search (cached per question for the visit, so rewriting the story from another
//    section only re-writes): Brave (main question: text + media), Tavily (perspectives),
//    Exa (counterpoints); News and Videos each try Exa → Tavily → Brave.
// 3. Writer (magazine-write edge function): one magazine feature in the chosen section's
//    voice (NYT / Wired desks), grounded ONLY in the sources (no invented quotes or numbers),
//    in the app's language, with a magazine headline + dek, a scene-setting lede, evocative
//    subheads, a kicker, and an image idea for the AI cover.

import { SearchResult, ImageResult, VideoResult } from '../../../commonApp/types/index';
import { braveSearchTool, type BraveSearchResults } from '../../../commonService/searchTools/braveSearchTool';
import { searchWithTavily } from '../../../commonService/searchTools/tavilyService';
import { searchExa } from '../../search/providers/engines/exaService';
import { searchSerpApiImages } from '../../search/providers/engines/serpApiImages';
import { logger } from '../../../utils/logger';
import { appSettings } from '../../../config/appSettings';
import { supabase } from '../../../lib/supabase';
import type { MagazineSection } from '../../auto/intentRouter.ts';

export interface StoryRequest {
  query: string;
  /** Article model (Luna/Sol/Astra), awaited just before writing; default Sol. */
  model?: Promise<string>;
  /** The section to write it for (Decisions' main pick, or the one the reader tapped). */
  section?: MagazineSection;
  /** The reader's city/country (for Local). */
  location?: string;
  /** Language code to write in (the app's language). */
  language?: string;
}

export interface NewsItem { title: string; url: string; snippet: string; source: string; image?: string }

export interface StoryResult {
  query: string;
  /** The section it was written for. */
  focus_category?: string;
  style_source?: string;
  headline: string;
  /** The dek under the headline. */
  subtitle: string;
  short_summary: string;
  markdown_report: string;
  /** English prompt for the AI cover image. */
  image_prompt?: string;
  follow_up_questions: string[];
  thinking_process: string;
  progress_updates: string[];
  search_queries: string[];
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
    image?: string;
    relevance_score?: number;
  }>;
  agent_contributions: Record<string, unknown>;
  citations: Array<{ text: string; source: { url: string; title?: string } }>;
  images?: ImageResult[];
  videos?: VideoResult[];
  news?: NewsItem[];
  story_areas: string[];
  confidence_level: number;
}

export type StoryStatusUpdate = (
  stage: string,
  timeRemaining: string,
  progress: number,
  thinkingStep: string,
  searchTerms?: string[],
  sources?: Array<{ url: string; title?: string; snippet?: string }>,
  currentAgent?: string,
  agentAction?: string,
  storyPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing'
) => void;

interface WriterOutput {
  headline: string;
  dek: string;
  short_summary: string;
  markdown_report: string;
  image_prompt: string;
  follow_up_questions: string[];
}

interface SearchBundle { queries: string[]; results: SearchResult[]; images: ImageResult[]; videos: VideoResult[]; news: NewsItem[] }

// One search per question for the whole visit: rewriting from another section reuses it.
const searches = new Map<string, Promise<SearchBundle>>();

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const youtubeId = (url: string) => url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/)?.[1];

// A slow provider must not hold the story: after `ms` it counts as empty.
const within = <T,>(work: Promise<T>, empty: T, ms = 15_000): Promise<T> =>
  Promise.race([work, new Promise<T>((resolve) => setTimeout(() => resolve(empty), ms))]);

export class StoryAgent {
  async process(request: StoryRequest, onStatusUpdate?: StoryStatusUpdate): Promise<StoryResult> {
    const { query } = request;
    if (!query?.trim()) throw new Error('Insight query cannot be empty');
    const section: MagazineSection = request.section ?? 'ideas';
    logger.info('StoryAgent: starting', { query, section });

    const cached = searches.has(query);
    onStatusUpdate?.(
      cached ? 'Rewriting Your Story' : 'Shaping Your Story',
      cached ? 'Almost complete' : 'About 1-2 minutes remaining',
      cached ? 60 : 10,
      'Finding the angle for your story',
      [], [], 'StoryWriter', 'Mapping the story and search strategy', 'analyzing'
    );

    const { queries, results, images, videos, news } = await this.searchOnce(query, onStatusUpdate);

    onStatusUpdate?.(
      'Writing Your Story', 'Almost complete', 70, 'Weaving the sources into a story',
      queries, results.slice(0, 5), 'StoryWriter', 'Writing the story', 'synthesizing'
    );

    const writer = await this.writeArticle(query, results, section, request, await request.model);

    const result: StoryResult = {
      query,
      focus_category: section,
      style_source: writer.style_source,
      headline: writer.headline,
      subtitle: writer.dek,
      short_summary: writer.short_summary,
      markdown_report: writer.markdown_report,
      image_prompt: writer.image_prompt,
      follow_up_questions: writer.follow_up_questions,
      thinking_process: `Magazine story on "${query}" for the ${section} section.`,
      progress_updates: ['Search angles drafted', 'Sources gathered', 'Story written'],
      search_queries: queries,
      sources: results.map((r) => ({ title: r.title, url: r.url, snippet: r.content.slice(0, 200), image: r.image, relevance_score: 0.8 })),
      agent_contributions: { StoryAgent: { section, sources_found: results.length } },
      citations: results.slice(0, 5).map((r) => ({ text: r.title, source: { title: r.title, url: r.url } })),
      images,
      videos,
      news,
      story_areas: [section],
      confidence_level: results.length >= 8 ? 85 : results.length >= 4 ? 70 : 60,
    };

    onStatusUpdate?.('Complete', 'Complete', 100, 'Your story is ready', queries, results.slice(0, 5), 'Complete', 'Ready', 'finalizing');
    return result;
  }

  // ---- Step 1 + 2: search angles and search (once per question) ----

  /** Start the search now (Magazine decides the section meanwhile). */
  prefetch(query: string, onStatusUpdate?: StoryStatusUpdate) {
    void this.searchOnce(query, onStatusUpdate).catch(() => undefined);
  }

  private searchOnce(query: string, onStatusUpdate?: StoryStatusUpdate): Promise<SearchBundle> {
    let search = searches.get(query);
    if (!search) {
      search = this.gather(query, onStatusUpdate);
      searches.set(query, search);
      search.catch(() => searches.delete(query));
    }
    return search;
  }

  private async gather(query: string, onStatusUpdate?: StoryStatusUpdate): Promise<SearchBundle> {
    const queries = await this.generateSearchQueries(query);
    onStatusUpdate?.(
      'Gathering Sources for Your Story', 'About 30 seconds remaining', 40,
      'Searching for relevant sources and information', queries, [], 'StoryWriter', 'Searching for sources across the web', 'searching'
    );
    const bundle = await this.search(queries, query);
    logger.info('StoryAgent: search complete', {
      results: bundle.results.length, images: bundle.images.length, videos: bundle.videos.length, news: bundle.news.length,
    });
    return { queries, ...bundle };
  }

  // Five questions, one bundle per intent, routed to three engines (see `search`):
  //   [0] the user's main question         → Brave (principal: text + media)
  //   [1],[2] two "perspective" questions  → Tavily (concatenated, one call)
  //   [3],[4] two "counterpoint" questions → Exa    (concatenated, one call) — seek limits/criticism
  // The templated questions key off a cleaned topic (command/interrogative lead-ins
  // stripped) so they read naturally even when the raw query is a command.
  private buildSearchQueries(query: string): string[] {
    const main = query.trim();
    const topic = this.topicOf(query);
    return [
      main,
      `What are the key facts and latest developments about ${topic}?`,
      `Why does ${topic} matter, and who is most affected?`,
      `What are the risks, downsides and criticisms of ${topic}?`,
      `What challenges, controversies or limitations surround ${topic}?`
    ];
  }

  // Strip a leading command verb / interrogative so templated questions read
  // naturally — "Tell about the World Cup 2026" → "the World Cup 2026".
  private topicOf(query: string): string {
    const lead = /^\s*(please\s+)?(tell me about|tell about|tell me|explain|describe|give me|show me|what is|what are|what's|who is|who are|how to|how do|how does|why is|why does|when is|where is)\b[:,\s]*/i;
    let q = query.trim().replace(/\?+$/g, '');
    q = q.replace(lead, '').replace(lead, '').trim(); // two passes for stacked lead-ins
    return q || query.trim();
  }

  // LLM-drafted search angles: keeps [0] as the user's verbatim question (Brave) and
  // asks the model for two sharp "perspective" and two "counterpoint" questions tuned
  // to the specific topic. Falls back to deterministic templates if the call fails or
  // returns an incomplete set, so search never blocks on the model.
  private async generateSearchQueries(query: string): Promise<string[]> {
    const main = query.trim();
    try {
      const systemPrompt = `You craft web-search questions for a research story. Return STRICT JSON only, no markdown:
{
  "perspective": ["question 1", "question 2"],
  "counterpoint": ["question 1", "question 2"]
}
- "perspective": two DISTINCT questions exploring the topic's significance, context, key facts or who is most affected.
- "counterpoint": two questions probing risks, criticisms, downsides, challenges, controversies or limitations.
Each question must be a single, specific, naturally-phrased question about the topic, max ~16 words, no numbering, no markdown.`;
      const userPrompt = `Topic: "${main}"`;
      const content = await this.callLLM(systemPrompt, userPrompt);
      const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      const pick = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).map((q) => q.trim()) : [];
      const perspective = pick(parsed.perspective);
      const counterpoint = pick(parsed.counterpoint);
      if (perspective.length >= 2 && counterpoint.length >= 2) {
        logger.info('StoryAgent: LLM drafted search queries', { perspective, counterpoint });
        return [main, perspective[0], perspective[1], counterpoint[0], counterpoint[1]];
      }
      logger.warn('StoryAgent: LLM query draft incomplete, using deterministic fallback');
    } catch (error) {
      logger.warn('StoryAgent: LLM query draft failed, using deterministic fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    return this.buildSearchQueries(query);
  }

  // Shared call to the OpenAI Supabase edge function (same transport the writer uses).
  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
      ? import.meta.env.VITE_OPENAI_API_URL
      : 'VITE_OPENAI_API_URL';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000), // the angles have a template fallback; never wait long
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: appSettings.models.utility,
          response_format: { type: 'json_object' }
        })
      })
    });
    const data = await response.json();
    const content = data.text || data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No response content from LLM');
    return content;
  }

  // A concrete, reformulated version of the user's query for IMAGE/VIDEO search.
  // The raw query is often a question ("is X worth it?") which returns poorly
  // aligned visuals — strip interrogatives/filler so search keys off the nouns.
  private buildImageQuery(query: string): string {
    const stopwords = /^\s*(what|why|how|who|when|where|which|whose|is|are|was|were|do|does|did|can|could|should|would|will|the|a|an)\b\s*/i;
    let q = query.trim().replace(/\?+/g, ' ');
    q = q.replace(stopwords, '').replace(stopwords, ''); // two passes for stacked stopwords
    return q.replace(/\s+/g, ' ').trim() || query.trim();
  }

  // Brave runs the user's main question (and yields media + news); Tavily and Exa add the
  // perspective and counterpoint angles. News and videos each try Exa → Tavily → Brave.
  private async search(queries: string[], originalQuery: string): Promise<Omit<SearchBundle, 'queries'>> {
    const [main, perspectiveA, perspectiveB, counterA, counterB] = queries;
    const topic = this.buildImageQuery(originalQuery);

    const [brave, tavily, exa] = await Promise.all([
      within(this.runBrave(main), { web: [], images: [], news: [], videos: [] }),
      within(this.runTavily(`${perspectiveA} ${perspectiveB}`.trim()), []),
      within(this.runExa(`${counterA} ${counterB}`.trim()), [])
    ]);

    const results = this.mergeText(this.clean(brave.web), exa, tavily);
    const [images, videos, news] = await Promise.all([
      within(this.resolveImages(topic, brave.images), []),
      within(this.findVideos(topic, brave.videos), []),
      within(this.findNews(main, brave.news), []),
    ]);
    // News photos lead: a news story's photo cover comes from the reporting, not a generic image search.
    const newsPhotos: ImageResult[] = news.filter((n) => n.image).map((n) => ({ url: n.image!, image: n.image!, alt: n.title, title: n.title, source_url: n.url }));
    return { results, images: this.dedupeByUrl([...newsPhotos, ...images]).slice(0, 12), videos, news };
  }

  private clean(results: SearchResult[]): SearchResult[] {
    return results.filter((r) => r.url && r.url !== '#' && r.title && r.content).slice(0, 10);
  }

  // Brave — principal: one call yields web (text), images and videos. Self-guarded
  // so a failure never sinks the Promise.all (the perspectives carry the load).
  private async runBrave(query: string): Promise<BraveSearchResults> {
    try {
      return await braveSearchTool(query);
    } catch (error) {
      logger.warn('StoryAgent: Brave search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { web: [], images: [], news: [], videos: [] };
    }
  }

  // Exa — text perspective. Exa returns WebSearchResult (content optional, carries a
  // snippet) — map it into SearchResult shape (content required) before cleaning.
  private async runExa(query: string): Promise<SearchResult[]> {
    try {
      const exa = await searchExa(query, 10);
      const mapped: SearchResult[] = exa.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content || r.snippet || ''
      }));
      return this.clean(mapped);
    } catch (error) {
      logger.warn('StoryAgent: Exa search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  // Tavily — text perspective.
  private async runTavily(query: string): Promise<SearchResult[]> {
    try {
      const tavily = await searchWithTavily(query);
      return this.clean(tavily.results || []);
    } catch (error) {
      logger.warn('StoryAgent: Tavily search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  // Merge Brave (principal) with Exa + Tavily (perspectives), dedupe by URL, cap 12.
  private mergeText(brave: SearchResult[], exa: SearchResult[], tavily: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const merged: SearchResult[] = [];
    for (const r of [...brave, ...exa, ...tavily]) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      merged.push(r);
    }
    return merged.slice(0, 12);
  }

  // News: Exa (news category) → Tavily (news topic) → Brave news, until there are enough.
  private async findNews(query: string, braveNews: BraveSearchResults['news']): Promise<NewsItem[]> {
    const ENOUGH = 5;
    const toItem = (r: { title: string; url: string; content?: string; snippet?: string; image?: string }): NewsItem =>
      ({ title: r.title, url: r.url, snippet: (r.content || r.snippet || '').slice(0, 220), source: hostOf(r.url), image: r.image });
    let items: NewsItem[] = (await searchExa(query, 10, { category: 'news' }).catch(() => [])).map(toItem);
    if (items.length < ENOUGH) {
      const tavily = await searchWithTavily(query, 'basic', { topic: 'news' }).catch(() => ({ results: [] as SearchResult[] }));
      items = [...items, ...tavily.results.map(toItem)];
    }
    if (items.length < ENOUGH) items = [...items, ...braveNews.map(toItem)];
    return this.dedupeByUrl(items.filter((n) => n.url && n.title)).slice(0, 10);
  }

  // Videos: YouTube results from Exa → Tavily → Brave videos, until there are enough.
  private async findVideos(query: string, braveVideos: BraveSearchResults['videos']): Promise<VideoResult[]> {
    const ENOUGH = 4;
    const fromWeb = (r: { title: string; url: string }): VideoResult | null => {
      const id = youtubeId(r.url);
      return id ? { title: r.title, url: r.url, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` } : null;
    };
    const yt = { includeDomains: ['youtube.com'] };
    let videos = (await searchExa(query, 10, yt).catch(() => [])).map(fromWeb).filter((v): v is VideoResult => !!v);
    if (videos.length < ENOUGH) {
      const tavily = await searchWithTavily(query, 'basic', yt).catch(() => ({ results: [] as SearchResult[] }));
      videos = [...videos, ...tavily.results.map(fromWeb).filter((v): v is VideoResult => !!v)];
    }
    if (videos.length < ENOUGH) videos = [...videos, ...braveVideos.filter((v) => !!v.url)];
    return this.dedupeByUrl(videos).slice(0, 10);
  }

  // Images: SerpApi keyed on the reformulated topic query is the primary source so
  // visuals stay aligned with the user's subject. Brave images (from the main
  // web query) are used ONLY as a fallback when SerpApi is sparse — never merged in
  // routinely — to avoid leaning on (and rate-limiting) Brave.
  private async resolveImages(query: string, braveImages: BraveSearchResults['images']): Promise<ImageResult[]> {
    const MIN_IMAGES = 4;
    const serp = await this.serpImages(query);
    if (serp.length >= MIN_IMAGES) return serp.slice(0, 12);

    const brave = braveImages
      .filter((img) => !!img.url)
      .map((img) => ({ url: img.url, image: img.url, alt: img.alt || query, source_url: img.source_url }));

    return this.dedupeByUrl([...serp, ...brave]).slice(0, 12);
  }

  private async serpImages(query: string): Promise<ImageResult[]> {
    try {
      const media = await searchSerpApiImages(query, 12);
      // `image` carries the reliably-hosted thumbnail the gallery displays.
      return media.map((img) => ({
        url: img.url,
        image: img.thumbnail || img.url,
        alt: img.title || query,
        title: img.title,
        source_url: img.source
      }));
    } catch (error) {
      logger.warn('StoryAgent: SerpApi image fallback failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  private dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of items) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      out.push(item);
    }
    return out;
  }

  // ---- Step 3: writer (magazine-write edge function: section voice, grounded in the sources) ----

  private async writeArticle(query: string, results: SearchResult[], section: MagazineSection, request: StoryRequest, model: string = appSettings.models.sol): Promise<WriterOutput & { style_source: string }> {
    const { data, error } = await supabase.functions.invoke('magazine-write', {
      body: {
        query,
        section,
        location: request.location ?? '',
        language: request.language || 'en',
        model,
        sources: results.slice(0, 10).map((r) => ({ title: r.title, url: r.url, content: r.content.slice(0, 700) })),
      },
    });
    if (error || !data?.markdown_report) {
      logger.error('StoryAgent: writer failed', { error: error?.message ?? data?.detail });
      throw new Error('The story could not be written. Please try again.');
    }
    return data as WriterOutput & { style_source: string };
  }
}
