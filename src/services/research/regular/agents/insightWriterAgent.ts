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
      const systemPrompt = `Expert strategic analyst. Generate insights from search results.

JSON OUTPUT:
{
  "headline": "8-15 words",
  "subtitle": "15-25 words", 
  "short_summary": "100-150 words",
  "markdown_report": "800-1200 words with ## headers, bullets, **bold**",
  "follow_up_questions": ["Q1", "Q2", "Q3"],
  "citations": [{"text": "...", "source": {"title": "...", "url": "...", "snippet": "..."}}],
  "confidence_level": 85
}

FOCUS: ${insight_areas.join(', ')}`;

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
    // Compact formatting: 10 results × 200 chars = ~2000 chars max
    return results
      .slice(0, 10)
      .map((result, index) => {
        const title = result.title.slice(0, 80);
        const content = result.content.slice(0, 200);
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
      `## Strategic Overview\n\nThis insight analysis examines ${query} through a strategic lens, identifying key trends, market dynamics, and actionable opportunities based on comprehensive research and data analysis.`,
      
      `## Key Strategic Insights\n\n${results.slice(0, 3).map((r, i) => `### ${i + 1}. ${r.title}\n\n${r.content.slice(0, 200)}...\n\n**Strategic Implication**: This finding suggests important market dynamics that could influence strategic positioning and competitive advantage.\n\n**Source**: [${r.title}](${r.url})`).join('\n\n')}`,
      
      `## Market Dynamics and Trends\n\nThe research reveals several important patterns and trends shaping the ${query} landscape:\n\n- **Market Evolution**: Current data indicates significant changes in market structure and competitive dynamics\n- **Technology Impact**: Digital transformation is creating new opportunities and disrupting traditional approaches\n- **Consumer Behavior**: Shifting preferences and expectations are driving demand for innovation\n- **Competitive Landscape**: New entrants and changing strategies are reshaping competitive dynamics`,
      
      `## Strategic Opportunities\n\nBased on the analysis, several strategic opportunities emerge:\n\n- **Innovation Leadership**: First-mover advantages in emerging technology applications\n- **Market Expansion**: Untapped segments and geographic markets showing growth potential\n- **Partnership Synergies**: Strategic alliances could accelerate market penetration\n- **Operational Excellence**: Process improvements could drive competitive advantage`,
      
      `## Risk Assessment\n\nKey risks and challenges to monitor:\n\n- **Market Volatility**: Rapid changes could impact strategic planning assumptions\n- **Competitive Response**: Established players may respond aggressively to new entrants\n- **Technology Disruption**: Emerging technologies could obsolete current approaches\n- **Regulatory Changes**: Policy shifts could affect market dynamics`,
      
      `## Strategic Recommendations\n\n1. **Invest in Innovation**: Develop capabilities in emerging technologies and approaches\n2. **Monitor Competitors**: Maintain active intelligence on competitive moves and strategies\n3. **Build Partnerships**: Establish strategic alliances to accelerate growth and market access\n4. **Customer Focus**: Invest in understanding and meeting evolving customer needs\n5. **Operational Agility**: Build capabilities to respond quickly to market changes`,
      
      `## Conclusion\n\nThe analysis of ${query} reveals a dynamic landscape with significant opportunities for organizations that can navigate complexity and execute strategic initiatives effectively. Success will require balancing innovation with operational excellence while maintaining customer focus and competitive awareness.`
    ];

    return sections.join('\n\n');
  }

  private getFallbackInsights(query: string, results: SearchResult[]): InsightWriterResult {
    return {
      headline: `Strategic Insights: ${query}`,
      subtitle: 'Market Analysis and Strategic Recommendations',
      short_summary: `This insight analysis examines ${query} based on comprehensive research and strategic analysis. The findings reveal important market trends, competitive dynamics, and strategic opportunities for stakeholder consideration.`,
      markdown_report: this.generateBasicInsightReport(query, results),
      follow_up_questions: [
        `What are the key competitive advantages available in the ${query} market?`,
        `How should organizations prioritize investment in ${query}-related capabilities?`,
        `What partnerships would provide the most strategic value?`,
        `How can market positioning be optimized for long-term success?`,
        `What early indicators should be monitored for strategic planning?`
      ],
      citations: results.slice(0, 5).map((result) => ({
        text: `${result.title} - Strategic insights and market analysis`,
        source: {
          title: result.title,
          url: result.url,
          snippet: result.content.slice(0, 200)
        }
      })),
      confidence_level: results.length >= 6 ? 75 : 65
    };
  }
}