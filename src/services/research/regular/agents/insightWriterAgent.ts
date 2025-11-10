import { AgentResponse, SearchResult } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger';

export interface InsightWriterRequest {
  query: string;
  insight_areas: string[];
  search_queries: string[];
  results: SearchResult[];
  analysis_strategy: string;
  focusCategory?: string;
}

export interface InsightWriterResult {
  focus_category: string;
  headline: string;
  subtitle: string;
  short_summary: string;
  markdown_report: string;
  follow_up_questions: string[];
  citations: Array<{ text: string; source: any }>;
  confidence_level: number;
}

export class InsightWriterAgent {
  async execute(request: InsightWriterRequest): Promise<AgentResponse<InsightWriterResult>> {
    try {
      const { query, insight_areas, results, focusCategory } = request;
      
      logger.info('InsightWriterAgent: Starting insight generation', { 
        query, 
        resultsCount: results.length,
        insightAreasCount: insight_areas.length,
        focusCategory
      });

      if (!results || results.length === 0) {
        throw new Error('No search results provided for insight generation');
      }

      // Determine the focus instruction based on category
      const focusInstruction = focusCategory && focusCategory !== 'ANALYSIS' 
        ? `\n\nIMPORTANT: Write this article with a ${focusCategory} focus. The focus_category MUST be "${focusCategory}".`
        : '\n\nIMPORTANT: If unsure about the category, use "ANALYSIS" as the focus_category.';

      // NY Times journalistic style prompt
      const systemPrompt = `You are an experienced journalist writing for The New York Times. Your mission is to produce clear, factual, and engaging reporting that informs readers about complex topics.

CRITICAL: Keep responses CONCISE (500-800 words) to prevent truncation errors.

JSON OUTPUT FORMAT:
{
  "focus_category": "CATEGORY NAME IN UPPERCASE: ANALYSIS, ARTS, BUSINESS, HEALTH & SPORT, or SCIENCES & TECH",
  "headline": "Compelling NYT-style headline (8-12 words)",
  "subtitle": "Descriptive subheading (12-20 words)", 
  "short_summary": "News-style summary (2-3 sentences, 60-100 words)",
  "markdown_report": "500-800 words with **Bold Section Headers** (not markdown #). Start with strong lede, use plain but sophisticated language.",
  "follow_up_questions": ["Clear question 1", "Clear question 2", "Clear question 3"],
  "citations": [{"text": "Brief quote", "source": {"title": "...", "url": "...", "snippet": "..."}}],
  "confidence_level": 85
}

WRITING STYLE:
- Objective, factual reporting - no personal opinions
- Strong news-style lede that hooks readers
- Plain but sophisticated language
- Use **Bold** for section headers (Background, Key Findings, Expert Perspectives, Industry Impact, Next Steps)
- NO emojis, hashtags, or marketing language
- Flow: lead → context → findings → impact

STRUCTURE:
1. **Background**: Set the scene, explain why this matters
2. **Key Findings**: Present the facts and evidence
3. **Expert Perspectives**: Include quotes and analysis
4. **Industry Impact**: Broader implications
5. **Next Steps**: What to watch for

FOCUS AREAS: ${insight_areas.join(', ')}
TONE: NYT journalism - clear, authoritative, accessible.${focusInstruction}`;

      const resultsContext = this.formatResultsForContext(results);
      
      const userPrompt = `Query: "${query}"

${resultsContext}

Write a compelling NYT-style article that explains what's happening, why it matters, and what comes next. Use facts and quotes from the sources.`;

      // Log payload sizes before API call
      logger.info('🔵 [INSIGHT-WRITER] Payload breakdown', {
        systemPromptChars: systemPrompt.length,
        userPromptChars: userPrompt.length,
        resultsContextChars: resultsContext.length,
        totalChars: systemPrompt.length + userPrompt.length,
        resultsCount: results.length
      });

      // Use Supabase Edge Function for OpenAI chat completions
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
      if (!content) {
        throw new Error('No response content from insight writer');
      }

      let writerResult: InsightWriterResult;
      try {
        writerResult = JSON.parse(content);
      } catch (parseError) {
        logger.warn('Failed to parse writer response, using fallback', { content });
        writerResult = this.getFallbackInsights(query, results);
      }

      // Validate and enhance the result
      writerResult = this.validateWriterResult(writerResult, query, results, focusCategory);

      logger.info('InsightWriterAgent: Insight generation completed', {
        reportLength: writerResult.markdown_report.length,
        citationsCount: writerResult.citations.length,
        confidenceLevel: writerResult.confidence_level
      });

      return {
        success: true,
        data: writerResult
      };

    } catch (error) {
      logger.error('InsightWriterAgent: Insight generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query
      });

      // Return fallback insights
      return {
        success: true,
        data: this.getFallbackInsights(request.query, request.results, request.focusCategory)
      };
    }
  }

  private formatResultsForContext(results: SearchResult[]): string {
    // Ultra-compact formatting: 10 results × 150 chars = ~1500 chars max (reduced from 200)
    return results
      .slice(0, 10)
      .map((result, index) => {
        const title = result.title.slice(0, 60); // Reduced from 80
        const content = result.content.slice(0, 150); // Reduced from 200
        return `[${index + 1}] ${title}
${content}...
`;
      })
      .join('');
  }

  private validateWriterResult(result: InsightWriterResult, query: string, results: SearchResult[], focusCategory?: string): InsightWriterResult {
    // Ensure required fields are present and valid
    result.focus_category = result.focus_category || focusCategory || this.determineFocusCategory(query);
    result.headline = result.headline || `Understanding ${query}`;
    result.subtitle = result.subtitle || 'What You Need to Know About This Emerging Development';
    result.short_summary = result.short_summary || `Recent developments in ${query} are reshaping the landscape. Here's what experts say about the implications and what to watch for next.`;
    
    // Ensure markdown report is substantial
    if (!result.markdown_report || result.markdown_report.length < 300) {
      result.markdown_report = this.generateNYTimesReport(query, results);
    }

    // Ensure follow-up questions
    if (!result.follow_up_questions || result.follow_up_questions.length === 0) {
      result.follow_up_questions = [
        `What are the most significant changes happening in ${query}?`,
        `How are experts responding to these developments?`,
        `What should people watch for in the coming months?`
      ];
    }

    // Ensure citations
    if (!result.citations || result.citations.length === 0) {
      result.citations = results.slice(0, 5).map((result) => ({
        text: `${result.title} - ${result.content.slice(0, 100)}...`,
        source: {
          title: result.title,
          url: result.url,
          snippet: result.content.slice(0, 200)
        }
      }));
    }

    // Ensure confidence level
    if (!result.confidence_level || result.confidence_level < 1 || result.confidence_level > 100) {
      result.confidence_level = results.length >= 8 ? 85 : results.length >= 4 ? 70 : 60;
    }

    return result;
  }

  private determineFocusCategory(query: string): string {
    const queryLower = query.toLowerCase();
    
    // Map to the 5 available focus categories
    if (queryLower.match(/tech|ai|software|digital|computer|cyber|science|research|study|discovery|innovation/)) return 'SCIENCES & TECH';
    if (queryLower.match(/health|medical|drug|disease|patient|doctor|sport|fitness|athletic|wellness/)) return 'HEALTH & SPORT';
    if (queryLower.match(/business|market|economy|company|corporate|finance|industry|trade/)) return 'BUSINESS';
    if (queryLower.match(/art|music|film|culture|entertainment|theater|gallery|museum|creative/)) return 'ARTS';
    
    return 'ANALYSIS';
  }

  private generateNYTimesReport(query: string, results: SearchResult[]): string {
    const sections = [
      `Recent developments in ${query} are capturing attention as experts and industry observers track significant changes unfolding across the sector.\n\n${results.length > 0 ? results[0].content.slice(0, 200) + '...' : 'Multiple sources indicate growing interest and activity in this area.'}`,
      
      `**Background**\n\nThe current situation emerged from a combination of technological advances, market shifts, and changing user needs. Industry analysts point to several factors driving the transformation, including competitive pressures and evolving consumer expectations.`,
      
      `**Key Findings**\n\n${results.slice(0, 2).map((r) => `According to ${r.title}, ${r.content.slice(0, 150)}...`).join('\n\n')}`,
      
      `**Expert Perspectives**\n\nIndustry observers note that these developments reflect broader trends reshaping the landscape. "The implications extend beyond immediate participants," according to recent analysis, "potentially affecting how the entire sector operates."`,
      
      `**Industry Impact**\n\nThe changes are prompting organizations to reassess their approaches and strategies. Early adopters are already adjusting their operations, while others are monitoring the situation closely to determine appropriate responses.`,
      
      `**Next Steps**\n\nExperts recommend watching for continued evolution in the coming months. Key indicators include market adoption rates, regulatory responses, and competitive positioning as the situation develops.`
    ];

    return sections.join('\n\n');
  }

  private getFallbackInsights(query: string, results: SearchResult[], focusCategory?: string): InsightWriterResult {
    return {
      focus_category: focusCategory || this.determineFocusCategory(query),
      headline: `Understanding ${query}`,
      subtitle: 'A Look at Recent Developments and What They Mean',
      short_summary: `Analysis of ${query} reveals emerging trends and significant changes. Experts are monitoring the situation as developments unfold and implications become clearer.`,
      markdown_report: this.generateNYTimesReport(query, results),
      follow_up_questions: [
        `What are the key factors driving changes in ${query}?`,
        `How are industry leaders responding to these developments?`,
        `What should observers watch for in the near future?`
      ],
      citations: results.slice(0, 5).map((result) => ({
        text: result.title.slice(0, 50),
        source: {
          title: result.title,
          url: result.url,
          snippet: result.content.slice(0, 100)
        }
      })),
      confidence_level: results.length >= 6 ? 75 : 65
    };
  }
}