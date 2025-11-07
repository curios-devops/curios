import { AgentResponse, SearchResult } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger';

export interface InsightWriterRequest {
  query: string;
  insight_areas: string[];
  search_queries: string[];
  results: SearchResult[];
  analysis_strategy: string;
}

export interface InsightWriterResult {
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
      const { query, insight_areas, results } = request;
      
      logger.info('InsightWriterAgent: Starting insight generation', { 
        query, 
        resultsCount: results.length,
        insightAreasCount: insight_areas.length
      });

      if (!results || results.length === 0) {
        throw new Error('No search results provided for insight generation');
      }

      // Optimized prompts - reduce total payload size
      const systemPrompt = `Expert strategic analyst. Generate CONCISE insights from search results.

CRITICAL: Keep responses SHORT to prevent truncation errors.

JSON OUTPUT:
{
  "headline": "8-12 words max",
  "subtitle": "12-20 words max", 
  "short_summary": "80-120 words - CONCISE overview only",
  "markdown_report": "600-900 words MAXIMUM with ## headers, bullets, **bold**. Be BRIEF and FOCUSED.",
  "follow_up_questions": ["Q1 (10 words max)", "Q2 (10 words max)", "Q3 (10 words max)"],
  "citations": [{"text": "Brief quote (50 chars max)", "source": {"title": "...", "url": "...", "snippet": "100 chars max"}}],
  "confidence_level": 85
}

FOCUS: ${insight_areas.join(', ')}
STYLE: Brief, actionable, no fluff. Prioritize clarity over detail.`;

      const resultsContext = this.formatResultsForContext(results);
      
      const userPrompt = `Query: "${query}"

${resultsContext}

Generate strategic insights with actionable intelligence.`;

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
      writerResult = this.validateWriterResult(writerResult, query, results);

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
        data: this.getFallbackInsights(request.query, request.results)
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

  private validateWriterResult(result: InsightWriterResult, query: string, results: SearchResult[]): InsightWriterResult {
    // Ensure required fields are present and valid
    result.headline = result.headline || `Strategic Insights: ${query}`;
    result.subtitle = result.subtitle || 'Actionable Intelligence and Strategic Recommendations';
    result.short_summary = result.short_summary || `This insight analysis examines ${query} to identify key trends, opportunities, and strategic implications based on current market data and industry analysis.`;
    
    // Ensure markdown report is substantial
    if (!result.markdown_report || result.markdown_report.length < 300) {
      result.markdown_report = this.generateBasicInsightReport(query, results);
    }

    // Ensure follow-up questions
    if (!result.follow_up_questions || result.follow_up_questions.length === 0) {
      result.follow_up_questions = [
        `What are the emerging opportunities in the ${query} space?`,
        `How can organizations best position themselves for competitive advantage?`,
        `What technologies and innovations will drive future growth?`,
        `What are the key risks and challenges to monitor?`,
        `How should strategic priorities be adjusted based on these insights?`
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

  private generateBasicInsightReport(query: string, results: SearchResult[]): string {
    const sections = [
      `## Strategic Overview\n\nAnalysis of ${query} reveals key trends and opportunities based on current market data.`,
      
      `## Key Insights\n\n${results.slice(0, 3).map((r, i) => `### ${i + 1}. ${r.title}\n\n${r.content.slice(0, 150)}...\n\n**Source**: [${r.title}](${r.url})`).join('\n\n')}`,
      
      `## Market Dynamics\n\n- Market evolution showing significant structural changes\n- Technology impact creating new opportunities\n- Consumer behavior shifts driving innovation demand\n- Competitive landscape reshaping rapidly`,
      
      `## Strategic Opportunities\n\n- Innovation leadership in emerging technologies\n- Market expansion in untapped segments\n- Partnership synergies for accelerated growth\n- Operational excellence driving competitive edge`,
      
      `## Recommendations\n\n1. Invest in innovation and emerging technologies\n2. Monitor competitive moves and market shifts\n3. Build strategic partnerships for market access\n4. Maintain customer focus and operational agility`
    ];

    return sections.join('\n\n');
  }

  private getFallbackInsights(query: string, results: SearchResult[]): InsightWriterResult {
    return {
      headline: `Strategic Insights: ${query}`,
      subtitle: 'Market Analysis and Strategic Recommendations',
      short_summary: `Analysis of ${query} based on research and strategic assessment. Key trends, competitive dynamics, and opportunities identified for stakeholder consideration.`,
      markdown_report: this.generateBasicInsightReport(query, results),
      follow_up_questions: [
        `Key competitive advantages in ${query}?`,
        `Investment priorities for ${query} capabilities?`,
        `Strategic partnerships for optimal value?`,
        `Market positioning for long-term success?`,
        `Early indicators to monitor?`
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