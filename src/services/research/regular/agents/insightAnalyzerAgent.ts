import { AgentResponse } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger';

export interface InsightAnalysisRequest {
  query: string;
  focusMode: string;
}

export interface InsightAnalysisResult {
  insight_areas: string[];
  search_queries: string[];
  analysis_strategy: string;
  expected_insights: string[];
}

export class InsightAnalyzerAgent {
  async execute(request: InsightAnalysisRequest): Promise<AgentResponse<InsightAnalysisResult>> {
    try {
      const { query, focusMode } = request;
      
      logger.info('InsightAnalyzerAgent: Starting analysis', { query, focusMode });

      const systemPrompt = `You are an Insight Analyzer Agent responsible for identifying key areas for actionable insight generation.

Your task is to:
1. Identify 3-5 key insight areas that would provide the most value
2. Generate 3-4 strategic search queries optimized for insight discovery
3. Create an analysis strategy focused on finding patterns, trends, and actionable intelligence
4. Predict the types of insights that should be discoverable

Focus Mode Context: ${this.getFocusContext(focusMode)}

Guidelines for Insight Areas:
- Focus on actionable intelligence rather than basic facts
- Look for trends, patterns, opportunities, and implications
- Consider market dynamics, competitive landscape, emerging trends
- Identify decision-relevant information
- Emphasize forward-looking insights and strategic implications

Search Query Optimization:
- Use queries that uncover current trends and patterns
- Include terms like "trends", "analysis", "forecast", "impact", "growth"
- Target recent developments and industry insights
- Focus on data-driven sources and analytical content

Response must be valid JSON with this structure:
{
  "insight_areas": ["area1", "area2", "area3", "area4", "area5"],
  "search_queries": ["query1", "query2", "query3", "query4"],
  "analysis_strategy": "detailed strategy for insight extraction",
  "expected_insights": ["expected insight type 1", "expected insight type 2", ...]
}`;

      const userPrompt = `Analyze this query for insight generation opportunities:

Query: "${query}"
Focus Mode: ${focusMode}

Identify the key areas where actionable insights can be generated and create an optimal search strategy for insight discovery.`;


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
        throw new Error('No response content from insight analyzer');
      }

      let analysisResult: InsightAnalysisResult;
      try {
        analysisResult = JSON.parse(content);
      } catch (parseError) {
        logger.warn('Failed to parse analysis response, using fallback', { content });
        analysisResult = this.getFallbackAnalysis(query, focusMode);
      }

      // Validate and sanitize the result
      analysisResult = this.validateAnalysisResult(analysisResult, query, focusMode);

      logger.info('InsightAnalyzerAgent: Analysis completed', {
        insightAreasCount: analysisResult.insight_areas.length,
        queryCount: analysisResult.search_queries.length
      });

      return {
        success: true,
        data: analysisResult
      };

    } catch (error) {
      logger.error('InsightAnalyzerAgent: Analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query
      });

      // Return fallback analysis
      return {
        success: true,
        data: this.getFallbackAnalysis(request.query, request.focusMode)
      };
    }
  }

  private getFocusContext(focusMode: string): string {
    const contexts: Record<string, string> = {
      'health': 'Focus on health trends, medical innovations, treatment outcomes, health policy implications, and public health insights',
      'academic': 'Emphasize research trends, academic developments, institutional insights, scholarly impact, and educational implications',
      'finance': 'Prioritize market trends, financial patterns, investment insights, economic indicators, and financial strategy implications',
      'travel': 'Look for travel trends, destination insights, tourism patterns, travel technology developments, and industry changes',
      'social': 'Focus on social trends, community insights, behavioral patterns, social media analytics, and cultural implications',
      'math': 'Emphasize mathematical trends, computational insights, application patterns, and technological mathematical developments',
      'video': 'Prioritize video content trends, multimedia insights, platform analytics, and visual communication patterns',
      'web': 'Cover general web trends, digital insights, technology patterns, and online behavior analytics'
    };
    
    return contexts[focusMode] || contexts['web'];
  }

  private validateAnalysisResult(result: InsightAnalysisResult, query: string, focusMode: string): InsightAnalysisResult {
    // Ensure insight_areas is valid and not empty
    if (!result.insight_areas || !Array.isArray(result.insight_areas) || result.insight_areas.length === 0) {
      result.insight_areas = [
        `Market trends for ${query}`,
        `Growth patterns and opportunities`,
        `Competitive landscape analysis`,
        `Future outlook and predictions`,
        `Strategic implications`
      ];
    }

    // Limit to 5 insight areas maximum
    if (result.insight_areas.length > 5) {
      result.insight_areas = result.insight_areas.slice(0, 5);
    }

    // Ensure search_queries is valid and not empty
    if (!result.search_queries || !Array.isArray(result.search_queries) || result.search_queries.length === 0) {
      result.search_queries = [
        `${query} trends analysis`,
        `${query} market insights`,
        `${query} growth forecast`,
        `${query} industry analysis`
      ];
    }

    // Limit to 4 queries maximum
    if (result.search_queries.length > 4) {
      result.search_queries = result.search_queries.slice(0, 4);
    }

    // Ensure required fields are present
    result.analysis_strategy = result.analysis_strategy || `Comprehensive insight analysis on ${query} using ${focusMode} focus to identify trends, patterns, and actionable intelligence`;
    
    result.expected_insights = result.expected_insights || [
      'Current market trends and patterns',
      'Growth opportunities and challenges',
      'Competitive dynamics and positioning',
      'Future outlook and predictions',
      'Strategic recommendations'
    ];

    return result;
  }

  private getFallbackAnalysis(query: string, focusMode: string): InsightAnalysisResult {
    return {
      insight_areas: [
        `Current trends in ${query}`,
        `Market dynamics and patterns`,
        `Growth opportunities and challenges`,
        `Competitive landscape insights`,
        `Future outlook and implications`
      ],
      search_queries: [
        `${query} trends analysis`,
        `${query} market insights 2024`,
        `${query} growth forecast`,
        `${query} industry analysis`
      ],
      analysis_strategy: `Comprehensive insight analysis approach for "${query}" using ${focusMode} focus mode. Strategy involves analyzing current trends, market dynamics, growth patterns, and competitive landscape to generate actionable insights.`,
      expected_insights: [
        'Market trend identification',
        'Growth pattern analysis',
        'Competitive positioning insights',
        'Opportunity assessment',
        'Strategic recommendations'
      ]
    };
  }
}