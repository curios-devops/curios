// InsightAgent — single-agent Insights (Stories) pipeline.
//
// Replaces the former 3-agent swarm (InsightAnalyzerAgent + InsightsRetrieverAgent +
// InsightWriterAgent + InsightSwarmController). The analyzer's separate LLM call was
// redundant — the retriever simply joins queries into one search — so query expansion
// is now deterministic, leaving a single LLM call (the writer) to synthesise the
// article. Search is split: text via Exa → Tavily → Brave (text only), images via
// SerpApi → Brave. The output shape (InsightResult) and progress phases are unchanged
// so the UI stays untouched.

import { SearchResult, ImageResult, VideoResult } from '../../../../commonApp/types/index';
import { braveSearchTool } from '../../../../commonService/searchTools/braveSearchTool';
import { searchWithTavily } from '../../../../commonService/searchTools/tavilyService';
import { searchExa } from '../../../search/providers/engines/exaService';
import { searchImages as searchSerpBraveImages } from '../../../search/providers/mediaSearchProvider';
import { logger } from '../../../../utils/logger';

export interface InsightRequest {
  query: string;
  isPro?: boolean;
  focusCategory?: string;
}

export interface InsightResult {
  query: string;
  focus_category?: string;
  style_source?: string;
  headline: string;
  subtitle: string;
  short_summary: string;
  markdown_report: string;
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
  insight_areas: string[];
  confidence_level: number;
}

export type InsightStatusUpdate = (
  stage: string,
  timeRemaining: string,
  progress: number,
  thinkingStep: string,
  searchTerms?: string[],
  sources?: Array<{ url: string; title?: string; snippet?: string }>,
  currentAgent?: string,
  agentAction?: string,
  insightPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing'
) => void;

interface WriterOutput {
  focus_category: string;
  style_source: string;
  headline: string;
  subtitle: string;
  short_summary: string;
  markdown_report: string;
  follow_up_questions: string[];
  citations: Array<{ text: string; source: any }>;
  confidence_level: number;
}

export class InsightAgent {
  async process(request: InsightRequest, onStatusUpdate?: InsightStatusUpdate): Promise<InsightResult> {
    try {
      const { query } = request;
      if (!query?.trim()) {
        throw new Error('Insight query cannot be empty');
      }

      logger.info('InsightAgent: starting', { query, focusCategory: request.focusCategory });

      // Step 1 — Analysis (deterministic, no LLM call).
      const insightAreas = this.buildInsightAreas(query);
      const searchQueries = this.buildSearchQueries(query);
      const analysisStrategy = `Insight analysis on "${query}" — surface trends, patterns and actionable intelligence.`;

      onStatusUpdate?.(
        'Analyzing Query for Insight Opportunities',
        'About 1-2 minutes remaining',
        10,
        'Identifying key areas for actionable insights',
        [],
        [],
        'InsightAgent',
        'Mapping insight areas and search strategy',
        'analyzing'
      );

      // Step 2 — Search.
      onStatusUpdate?.(
        'Searching for Insights',
        'About 30 seconds remaining',
        40,
        'Searching for relevant sources and information',
        searchQueries,
        [],
        'InsightAgent',
        'Searching for sources across the web',
        'searching'
      );

      const { results, images } = await this.search(searchQueries);

      logger.info('InsightAgent: search complete', { resultsCount: results.length, imagesCount: images.length });

      // Step 3 — Synthesis (single LLM call).
      onStatusUpdate?.(
        'Generating Actionable Insights',
        'Almost complete',
        70,
        'Synthesising data into actionable intelligence',
        searchQueries,
        results.slice(0, 5),
        'InsightAgent',
        'Analysing patterns and writing the article',
        'synthesizing'
      );

      const writer = await this.writeArticle(query, results, insightAreas, request.focusCategory);

      // Step 4 — Assemble result.
      const result: InsightResult = {
        query,
        focus_category: writer.focus_category,
        style_source: writer.style_source,
        headline: writer.headline,
        subtitle: writer.subtitle,
        short_summary: writer.short_summary,
        markdown_report: writer.markdown_report,
        follow_up_questions: writer.follow_up_questions,
        thinking_process: analysisStrategy,
        progress_updates: [
          'Query analysis completed',
          'Strategic search executed',
          'Insights synthesized',
          'Recommendations generated'
        ],
        search_queries: searchQueries,
        sources: results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content.slice(0, 200),
          image: r.image,
          relevance_score: 0.8
        })),
        agent_contributions: {
          InsightAgent: {
            insight_areas: insightAreas,
            sources_found: results.length,
            insights_generated: writer.follow_up_questions.length
          }
        },
        citations: writer.citations,
        images,
        videos: [],
        insight_areas: insightAreas,
        confidence_level: writer.confidence_level
      };

      logger.info('InsightAgent: completed', {
        reportLength: result.markdown_report.length,
        sourcesCount: result.sources.length,
        focusCategory: result.focus_category
      });

      onStatusUpdate?.('Complete', 'Complete', 100, 'Insight generation complete', searchQueries, results.slice(0, 5), 'Complete', 'Ready', 'finalizing');

      return result;
    } catch (error) {
      logger.error('InsightAgent: failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query
      });
      onStatusUpdate?.('Complete', 'Complete', 100, 'Error occurred', [], [], 'Complete', 'Error', 'finalizing');
      return this.getFallbackResult(request.query);
    }
  }

  // ---- Step 1 helpers (deterministic analysis) ----

  private buildInsightAreas(query: string): string[] {
    return [
      `Current trends in ${query}`,
      'Market dynamics and patterns',
      'Growth opportunities and challenges',
      'Competitive landscape insights',
      'Future outlook and implications'
    ];
  }

  private buildSearchQueries(query: string): string[] {
    return [
      `${query} trends analysis`,
      `${query} market insights`,
      `${query} growth forecast`,
      `${query} industry analysis`
    ];
  }

  // ---- Step 2: search — Exa + Tavily + Brave + SerpApi(images) all in parallel ----
  // Exa carries the main results; Tavily and Brave add additional perspectives
  // (merged + deduped); images come from SerpApi → Brave. Everything runs
  // concurrently to keep latency down — no sequential fallback chain.

  private async search(queries: string[]): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
    const query = queries.join(' ').trim();
    const [exa, tavily, brave, images] = await Promise.all([
      this.runExa(query),
      this.runTavily(query),
      this.runBrave(query),
      this.searchImages(query)
    ]);

    const results = this.mergeText(exa, tavily, brave);
    logger.info('InsightAgent: parallel search complete', {
      exa: exa.length, tavily: tavily.length, brave: brave.length,
      merged: results.length, images: images.length
    });
    return { results, images };
  }

  private clean(results: SearchResult[]): SearchResult[] {
    return results.filter((r) => r.url && r.url !== '#' && r.title && r.content).slice(0, 10);
  }

  // Exa — main web search. Each engine is self-guarded so one failure never sinks
  // the Promise.all; empty results just mean the others carry the load.
  private async runExa(query: string): Promise<SearchResult[]> {
    try {
      return this.clean(await searchExa(query, 10));
    } catch (error) {
      logger.warn('InsightAgent: Exa search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  // Tavily — perspective source.
  private async runTavily(query: string): Promise<SearchResult[]> {
    try {
      const tavily = await searchWithTavily(query);
      return this.clean(tavily.results || []);
    } catch (error) {
      logger.warn('InsightAgent: Tavily search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  // Brave — perspective source.
  private async runBrave(query: string): Promise<SearchResult[]> {
    try {
      const brave = await braveSearchTool(query);
      return this.clean(brave.web || []);
    } catch (error) {
      logger.warn('InsightAgent: Brave search failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  // Merge Exa (main) with Tavily + Brave (perspectives), dedupe by URL, cap at 12.
  private mergeText(exa: SearchResult[], tavily: SearchResult[], brave: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const merged: SearchResult[] = [];
    for (const r of [...exa, ...tavily, ...brave]) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      merged.push(r);
    }
    return merged.slice(0, 12);
  }

  // Image search: SerpApi (primary) → Brave, via the shared media provider.
  // `url` keeps the full-res original (hero + click-through); `image` carries the
  // reliably-hosted thumbnail the gallery displays (originals often hotlink-403,
  // which would otherwise leave the Images tab empty).
  private async searchImages(query: string): Promise<ImageResult[]> {
    try {
      const media = await searchSerpBraveImages(query);
      return media.map((img) => ({
        url: img.url,
        image: img.thumbnail || img.url,
        alt: img.title || query,
        title: img.title,
        source_url: img.source
      }));
    } catch (error) {
      logger.warn('InsightAgent: image search failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  // ---- Step 3: writer (single LLM call, journalistic article) ----

  private async writeArticle(
    query: string,
    results: SearchResult[],
    insightAreas: string[],
    focusCategory?: string
  ): Promise<WriterOutput> {
    if (!results || results.length === 0) {
      return this.getFallbackInsights(query, results, focusCategory);
    }

    const detectedCategory = focusCategory || this.determineFocusCategory(query);
    const editorialStyle = this.getEditorialStyle(detectedCategory);

    const systemPrompt = `You are an elite investigative journalist with decades of experience writing for ${editorialStyle.source}.
Your mission is to craft a professional, balanced, and deeply insightful article that reads like the best journalism.

CRITICAL REQUIREMENTS:
- Write a COMPREHENSIVE essay of 800-1200 words (aim for 1000+ words for depth)
- This should be a genuine 2-3 minute read with substantial analysis
- Write in FLOWING, NARRATIVE prose - not fragmented bullet points
- ALWAYS start with a compelling opening paragraph that draws readers in
- Use **Bold Section Headers** to organize (NOT markdown # headers)
- Think like a journalist: Lead → Context → Analysis → Implications → Next Steps

JSON OUTPUT FORMAT:
{
  "focus_category": "${detectedCategory}",
  "style_source": "${editorialStyle.source}",
  "headline": "Compelling, NYT-style headline (8-12 words) that captures the core tension or development",
  "subtitle": "Contextual subheading (12-20 words) that expands on the headline with specifics",
  "short_summary": "Strong 2-3 sentence lede that answers: What happened? Why does it matter? What's at stake? (60-100 words)",
  "markdown_report": "FULL 800-1200 word article. Start with **Opening Section Title** (like 'The Shift', 'Breaking Ground', 'A New Era') followed by 3-4 engaging paragraphs. Then continue with 3-4 more **Bold Sections** with 2-3 paragraphs each. Write in natural, flowing journalistic prose. NO bullet points. NO lists. Pure narrative storytelling with facts, context, expert voices, and implications woven throughout.",
  "follow_up_questions": ["What factors will determine...", "How might this development affect...", "What are the longer-term implications for..."],
  "citations": [{"text": "Direct quote or key fact", "source": {"title": "...", "url": "...", "snippet": "..."}}],
  "confidence_level": 85
}

${editorialStyle.source} WRITING PRINCIPLES:
Tone: ${editorialStyle.tone}
Approach: ${editorialStyle.style}

NARRATIVE STRUCTURE (be flexible and natural):
${editorialStyle.structure}

ESSENTIAL WRITING GUIDELINES:
• START STRONG: Open with a vivid scene, striking fact, or compelling tension
• NARRATIVE FLOW: Connect paragraphs with transitions. Tell a story, don't list facts
• SHOW, DON'T TELL: Use specific examples, quotes, and concrete details
• MULTIPLE PERSPECTIVES: Include expert voices, data, and different viewpoints
• CONTEXT IS KING: Explain the "why" and "how we got here" before diving into implications
• DEPTH OVER BREADTH: Go deeper into key themes rather than skimming many topics
• HUMAN ELEMENT: Connect to real-world impact on people, companies, or society
• AUTHORITATIVE YET ACCESSIBLE: Write with sophistication but remain clear
• NO CONCLUSIONS: Let the narrative and facts speak. End with forward-looking insight

FOCUS AREAS TO EXPLORE: ${insightAreas.join(', ')}

REMEMBER: You're writing feature journalism, not a report. The article should feel alive, insightful, and worth reading. Aim for AT LEAST 900 words. The focus_category MUST be "${detectedCategory}".`;

    const resultsContext = this.formatResultsForContext(results);

    const userPrompt = `Query: "${query}"

${resultsContext}

Write a compelling, deeply researched article in the style of ${editorialStyle.source}. This is feature journalism - tell a story with the facts.

IMPORTANT:
- Write a FULL 800-1200 word article (don't stop at 500-600 words!)
- Start with an engaging opening section with a **Bold Title**
- Use flowing, narrative paragraphs (3-5 sentences each)
- Include expert quotes and specific data from sources
- Connect ideas with transitions between sections
- End with forward-looking analysis, not a summary

Make this feel like a premium piece of journalism that readers will want to finish.`;

    try {
      const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
        ? import.meta.env.VITE_OPENAI_API_URL
        : 'VITE_OPENAI_API_URL';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          prompt: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          })
        })
      });
      const data = await response.json();
      const content = data.text || data.choices?.[0]?.message?.content;
      if (!content) throw new Error('No response content from insight writer');

      let writerResult: WriterOutput;
      try {
        writerResult = JSON.parse(content);
      } catch {
        logger.warn('InsightAgent: failed to parse writer response, using fallback');
        writerResult = this.getFallbackInsights(query, results, focusCategory);
      }

      return this.validateWriterResult(writerResult, query, results, focusCategory);
    } catch (error) {
      logger.error('InsightAgent: writer failed, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return this.getFallbackInsights(query, results, focusCategory);
    }
  }

  private formatResultsForContext(results: SearchResult[]): string {
    return results
      .slice(0, 10)
      .map((result, index) => {
        const title = result.title.slice(0, 60);
        const content = result.content.slice(0, 150);
        return `[${index + 1}] ${title}\n${content}...\n`;
      })
      .join('');
  }

  private validateWriterResult(result: WriterOutput, query: string, results: SearchResult[], focusCategory?: string): WriterOutput {
    const detectedCategory = result.focus_category || focusCategory || this.determineFocusCategory(query);
    const editorialStyle = this.getEditorialStyle(detectedCategory);

    result.focus_category = detectedCategory;
    result.style_source = result.style_source || editorialStyle.source;
    result.headline = result.headline || `Understanding ${query}`;
    result.subtitle = result.subtitle || 'What You Need to Know About This Emerging Development';
    result.short_summary = result.short_summary || `Recent developments in ${query} are reshaping the landscape. Here's what experts say about the implications and what to watch for next.`;

    if (!result.markdown_report || result.markdown_report.length < 300) {
      result.markdown_report = this.generateStyledReport(query, results, detectedCategory);
    }

    if (!result.follow_up_questions || result.follow_up_questions.length === 0) {
      result.follow_up_questions = [
        `What are the most significant changes happening in ${query}?`,
        `How are experts responding to these developments?`,
        `What should people watch for in the coming months?`
      ];
    }

    if (!result.citations || result.citations.length === 0) {
      result.citations = results.slice(0, 5).map((r) => ({
        text: `${r.title} - ${r.content.slice(0, 100)}...`,
        source: { title: r.title, url: r.url, snippet: r.content.slice(0, 200) }
      }));
    }

    if (!result.confidence_level || result.confidence_level < 1 || result.confidence_level > 100) {
      result.confidence_level = results.length >= 8 ? 85 : results.length >= 4 ? 70 : 60;
    }

    return result;
  }

  private determineFocusCategory(query: string): string {
    const queryLower = query.toLowerCase();

    if (/business|market|economy|company|corporate|finance|industry|trade|stock|earning|earnings|revenue|profit|sales|investor|investment|quarter|quarterly|fiscal|financial|merger|acquisition|ceo|executive|wall street|shares|shareholder|dividend/.test(queryLower)) {
      return 'BUSINESS';
    }
    if (/health|medical|drug|disease|patient|doctor|sport|fitness|athletic|wellness|nutrition|diet|exercise|clinic|hospital|therapy/.test(queryLower)) {
      return 'HEALTH & SPORT';
    }
    if (/tech|ai|software|digital|computer|cyber|science|research|study|discovery|innovation|algorithm|cloud|internet|web|app|programming/.test(queryLower)) {
      return 'SCIENCES & TECH';
    }
    if (/art|music|film|culture|entertainment|theater|theatre|gallery|museum|creative|movie|show|concert|exhibition|fashion|design|style/.test(queryLower)) {
      return 'ARTS';
    }
    return 'ANALYSIS';
  }

  private getEditorialStyle(focusCategory: string): { source: string; tone: string; style: string; structure: string } {
    switch (focusCategory) {
      case 'BUSINESS':
        return {
          source: 'Wall Street Journal',
          tone: 'Data-driven, executive-focused, action-oriented',
          style: 'Open with the market-moving development or strategic shift. Weave in precise metrics and financial data throughout the narrative. Quote executives and analysts to add authority. Examine competitive dynamics and strategic implications. Connect financial moves to broader industry trends. Write multiple flowing paragraphs per section - avoid choppy, fragmented text. End with forward-looking market implications.',
          structure: '**The Move** (3-4 paragraphs setting the scene) → **The Numbers** (2-3 paragraphs with data and context) → **The Strategy** (3-4 paragraphs analyzing decisions) → **The Ripple Effect** (2-3 paragraphs on wider impact) → **The Road Ahead** (2-3 paragraphs on future outlook)'
        };
      case 'SCIENCES & TECH':
        return {
          source: 'Wired',
          tone: 'Futuristic, accessible, wonder-filled',
          style: 'Begin with a compelling scene or breakthrough moment. Make complex technology tangible through vivid analogies and real-world examples. Show how the innovation connects to human needs and societal change. Include voices from creators, users, and experts. Maintain a sense of possibility and curiosity throughout. Write in long, flowing paragraphs that build momentum. Balance technical accuracy with narrative storytelling.',
          structure: '**The Breakthrough** (3-4 paragraphs introducing innovation) → **How It Works** (3-4 paragraphs explaining technology) → **The Human Element** (3-4 paragraphs on real impact) → **The Bigger Picture** (2-3 paragraphs on implications) → **What Comes Next** (2-3 paragraphs on future possibilities)'
        };
      case 'ARTS':
        return {
          source: 'Vogue',
          tone: 'Elegant, sensory, emotionally resonant',
          style: 'Paint a vivid picture with rich sensory details and emotional depth. Explore the creative vision and cultural significance with sophistication. Use elegant, rhythmic prose that mirrors the artistry being discussed. Include voices of creators and cultural observers. Connect aesthetic choices to broader cultural movements. Write in long, luxurious paragraphs that reward close reading. Let the narrative breathe and unfold naturally.',
          structure: '**The Moment** (3-4 paragraphs capturing the scene) → **The Vision** (3-4 paragraphs on creative intent) → **The Craft** (2-3 paragraphs on technique and execution) → **The Resonance** (3-4 paragraphs on cultural impact) → **The Legacy** (2-3 paragraphs on lasting significance)'
        };
      case 'HEALTH & SPORT':
        return {
          source: 'Health Magazine',
          tone: 'Energetic, evidence-based, empowering',
          style: 'Start with a relatable scenario or surprising finding. Ground advice in solid research and expert medical opinion. Share real stories that illustrate the science in action. Translate complex medical information into clear, actionable insights. Maintain an encouraging, energetic voice throughout. Write in substantial, informative paragraphs that build understanding progressively. Connect individual health choices to broader wellness trends.',
          structure: '**The Discovery** (3-4 paragraphs introducing the finding) → **The Science Explained** (3-4 paragraphs breaking down research) → **Real Stories** (2-3 paragraphs with examples) → **Expert Guidance** (3-4 paragraphs with actionable advice) → **Your Path Forward** (2-3 paragraphs on next steps)'
        };
      default:
        return {
          source: 'New York Times',
          tone: 'Objective, authoritative, deeply reported',
          style: 'Begin with a strong news lede that captures the essential development. Build context layer by layer, explaining how we arrived at this moment. Present multiple perspectives fairly with thorough attribution. Use concrete examples and verified data to support analysis. Examine implications for different stakeholders. Write in substantial, well-developed paragraphs that advance understanding. Avoid rushed transitions - let ideas fully develop. End with forward-looking questions or emerging trends, not summary.',
          structure: '**The Development** (3-4 paragraphs establishing the story) → **The Background** (3-4 paragraphs providing context) → **Multiple Voices** (3-4 paragraphs with diverse perspectives) → **The Implications** (3-4 paragraphs analyzing impact) → **The Questions Ahead** (2-3 paragraphs on what\'s next)'
        };
    }
  }

  private generateStyledReport(query: string, results: SearchResult[], focusCategory: string): string {
    const editorialStyle = this.getEditorialStyle(focusCategory);
    const structureParts = editorialStyle.structure
      .split(' → ')
      .map((s) => s.replace(/\*\*/g, '').replace(/\s*\([^)]*\)/g, '').trim());

    let intro = '';
    if (focusCategory === 'BUSINESS') {
      intro = `Market dynamics in ${query} are shifting as key players respond to emerging pressures and opportunities.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Industry sources indicate significant movement in this sector.'}`;
    } else if (focusCategory === 'SCIENCES & TECH') {
      intro = `A breakthrough in ${query} signals a new chapter in how we understand and interact with this technology.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Researchers and developers are exploring innovative approaches.'}`;
    } else if (focusCategory === 'ARTS') {
      intro = `In the world of ${query}, a new creative vision is taking shape—one that speaks to our moment and points toward something larger.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Artists and cultural observers are tracing these evolving currents.'}`;
    } else if (focusCategory === 'HEALTH & SPORT') {
      intro = `New insights into ${query} are empowering people to make informed decisions about their health and performance.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Experts are translating cutting-edge research into practical guidance.'}`;
    } else {
      intro = `Recent developments in ${query} are capturing attention as experts and observers track significant changes unfolding across the sector.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Multiple sources indicate growing interest and activity in this area.'}`;
    }

    const sections = [
      intro,
      `**${structureParts[0] || 'Background'}**\n\nThe current situation emerged from a combination of ${focusCategory === 'BUSINESS' ? 'market forces, competitive dynamics, and strategic decisions' : focusCategory === 'SCIENCES & TECH' ? 'technological advances, research breakthroughs, and innovative thinking' : focusCategory === 'ARTS' ? 'cultural shifts, creative exploration, and evolving aesthetics' : focusCategory === 'HEALTH & SPORT' ? 'scientific discoveries, clinical evidence, and expert consensus' : 'technological advances, market shifts, and changing needs'}. ${focusCategory === 'BUSINESS' ? 'Executives and analysts' : focusCategory === 'SCIENCES & TECH' ? 'Researchers and engineers' : focusCategory === 'ARTS' ? 'Artists and curators' : focusCategory === 'HEALTH & SPORT' ? 'Health professionals and researchers' : 'Industry observers'} point to several factors driving the transformation.`,
      `**${structureParts[1] || 'Key Findings'}**\n\n${results.slice(0, 2).map((r) => `${focusCategory === 'BUSINESS' ? 'Market data shows' : focusCategory === 'SCIENCES & TECH' ? 'Research indicates' : focusCategory === 'ARTS' ? 'Critical analysis reveals' : focusCategory === 'HEALTH & SPORT' ? 'Studies demonstrate' : 'According to'} ${r.title}, ${r.content.slice(0, 150)}...`).join('\n\n')}`,
      `**${structureParts[2] || 'Expert Perspectives'}**\n\n${focusCategory === 'BUSINESS' ? 'Industry leaders and financial analysts' : focusCategory === 'SCIENCES & TECH' ? 'Leading researchers and technologists' : focusCategory === 'ARTS' ? 'Critics and cultural observers' : focusCategory === 'HEALTH & SPORT' ? 'Medical experts and wellness professionals' : 'Industry observers'} note that these developments reflect broader trends.`,
      `**${structureParts[3] || 'Impact'}**\n\nThe changes are prompting ${focusCategory === 'BUSINESS' ? 'organizations to reassess strategies and market positioning' : focusCategory === 'SCIENCES & TECH' ? 'institutions to rethink approaches and capabilities' : focusCategory === 'ARTS' ? 'the cultural landscape to evolve in unexpected ways' : focusCategory === 'HEALTH & SPORT' ? 'individuals to reconsider their health and fitness approaches' : 'stakeholders to adjust their approaches'}.`,
      `**${structureParts[4] || 'Next Steps'}**\n\n${focusCategory === 'BUSINESS' ? 'Market watchers' : focusCategory === 'SCIENCES & TECH' ? 'Technology observers' : focusCategory === 'ARTS' ? 'Cultural commentators' : focusCategory === 'HEALTH & SPORT' ? 'Health experts' : 'Experts'} recommend continued monitoring of developments in the coming months.`
    ];

    return sections.join('\n\n');
  }

  private getFallbackInsights(query: string, results: SearchResult[], focusCategory?: string): WriterOutput {
    const detectedCategory = focusCategory || this.determineFocusCategory(query);
    const editorialStyle = this.getEditorialStyle(detectedCategory);

    return {
      focus_category: detectedCategory,
      style_source: editorialStyle.source,
      headline: `Understanding ${query}`,
      subtitle: 'A Look at Recent Developments and What They Mean',
      short_summary: `Analysis of ${query} reveals emerging trends and significant changes. Experts are monitoring the situation as developments unfold and implications become clearer.`,
      markdown_report: this.generateStyledReport(query, results, detectedCategory),
      follow_up_questions: [
        `What are the key factors driving changes in ${query}?`,
        `How are industry leaders responding to these developments?`,
        `What should observers watch for in the near future?`
      ],
      citations: results.slice(0, 5).map((r) => ({
        text: r.title.slice(0, 50),
        source: { title: r.title, url: r.url, snippet: r.content.slice(0, 100) }
      })),
      confidence_level: results.length >= 6 ? 75 : 65
    };
  }

  private getFallbackResult(query: string): InsightResult {
    const writer = this.getFallbackInsights(query, []);
    return {
      query,
      focus_category: writer.focus_category,
      style_source: writer.style_source,
      headline: writer.headline,
      subtitle: writer.subtitle,
      short_summary: writer.short_summary,
      markdown_report: writer.markdown_report,
      follow_up_questions: writer.follow_up_questions,
      thinking_process: `Strategic analysis approach for ${query}`,
      progress_updates: ['Analysis initiated', 'Data gathered', 'Insights generated'],
      search_queries: this.buildSearchQueries(query),
      sources: [],
      agent_contributions: {},
      citations: writer.citations,
      images: [],
      videos: [],
      insight_areas: this.buildInsightAreas(query),
      confidence_level: writer.confidence_level
    };
  }
}
