import { AgentResponse, SearchResult } from '../../../../commonApp/types/index';
import { secureOpenAI } from '../../../../commonService/openai/secureOpenAI';
import { logger } from '../../../../utils/logger';

export interface ResearchWriterRequest {
  query: string;
  focusMode: string;
  search_queries: string[];
  results: SearchResult[];
  thinking_process: string;
}

export interface ResearchWriterResult {
  headline: string;
  subtitle: string;
  short_summary: string;
  markdown_report: string;
  follow_up_questions: string[];
  citations: Array<{ text: string; source: SearchResult }>;
}

export class ResearchWriterAgent {
  async execute(request: ResearchWriterRequest): Promise<AgentResponse<ResearchWriterResult>> {
    try {
      const { query, focusMode, search_queries, results, thinking_process } = request;
      
      logger.info('ResearchWriterAgent: Starting synthesis', { 
        query, 
        focusMode, 
        resultsCount: results.length 
      });

      if (!results || results.length === 0) {
        throw new Error('No search results provided for synthesis');
      }

      const systemPrompt = `You are a Research Writer Agent specialized in creating comprehensive, well-structured research reports.

Your task is to synthesize search results into a detailed research report with the following structure:

REQUIREMENTS:
1. **Headline**: Compelling, informative title (8-12 words)
2. **Subtitle**: Descriptive subtitle providing context (15-25 words)
3. **Short Summary**: Executive summary in 2-3 sentences (100-150 words)
4. **Markdown Report**: Comprehensive report (800-1200 words) with:
   - Clear section headers
   - Detailed analysis with evidence
   - Current data and statistics when available
   - Multiple perspectives on the topic
   - Practical implications or applications
   - Well-structured markdown formatting
5. **Follow-up Questions**: 4-5 relevant questions for deeper exploration
6. **Citations**: Properly formatted citations with inline references

Focus Mode: ${this.getFocusContext(focusMode)}

FORMATTING GUIDELINES:
- Use proper markdown headers (##, ###)
- Include bullet points for key information
- Use **bold** for emphasis on important concepts
- Include inline citations using [^1] format
- Structure content logically with smooth transitions
- Ensure content is current, accurate, and comprehensive

Response must be valid JSON with this exact structure:
{
  "headline": "...",
  "subtitle": "...", 
  "short_summary": "...",
  "markdown_report": "...",
  "follow_up_questions": ["...", "...", "...", "...", "..."],
  "citations": [{"text": "citation text", "source": {"title": "...", "url": "...", "snippet": "..."}}]
}`;

      const resultsContext = this.formatResultsForContext(results);
      
      const userPrompt = `Research Query: "${query}"
Focus Mode: ${focusMode}
Search Strategy: ${search_queries.join(', ')}
Planning Context: ${thinking_process}

SEARCH RESULTS TO SYNTHESIZE:
${resultsContext}

Create a comprehensive research report synthesizing these findings. Ensure the report is authoritative, well-structured, and provides valuable insights on the topic.`;

      const response = await secureOpenAI.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from research writer');
      }

      let writerResult: ResearchWriterResult;
      try {
        writerResult = JSON.parse(content);
      } catch (_parseError) {
        logger.warn('Failed to parse writer response, using fallback', { content });
        writerResult = this.getFallbackReport(query, results);
      }

      // Validate and enhance the result
      writerResult = this.validateWriterResult(writerResult, query, results);

      logger.info('ResearchWriterAgent: Synthesis completed', {
        reportLength: writerResult.markdown_report.length,
        citationsCount: writerResult.citations.length
      });

      return {
        success: true,
        data: writerResult
      };

    } catch (error) {
      logger.error('ResearchWriterAgent: Synthesis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query
      });

      // Return fallback report
      return {
        success: true,
        data: this.getFallbackReport(request.query, request.results)
      };
    }
  }

  private getFocusContext(focusMode: string): string {
    const contexts: Record<string, string> = {
      'health': 'Emphasize evidence-based medical information, health research, clinical findings, and health implications',
      'academic': 'Focus on scholarly analysis, research methodology, academic perspectives, and peer-reviewed insights',
      'finance': 'Highlight financial analysis, market trends, economic data, investment implications, and financial metrics',
      'travel': 'Cover travel insights, cultural information, practical advice, and current travel conditions',
      'social': 'Include social trends, community impact, public opinion, and social implications',
      'math': 'Emphasize mathematical concepts, technical accuracy, mathematical applications, and precise definitions',
      'video': 'Reference visual content and multimedia sources when available',
      'web': 'Provide comprehensive analysis covering all relevant online perspectives and current information'
    };
    
    return contexts[focusMode] || contexts['web'];
  }

  private formatResultsForContext(results: SearchResult[]): string {
    return results
      .slice(0, 10) // Limit to top 10 results
      .map((result, index) => {
        return `[${index + 1}] **${result.title}**
URL: ${result.url}
Content: ${result.content.slice(0, 300)}${result.content.length > 300 ? '...' : ''}
${result.image ? `Image: ${result.image}` : ''}

---`;
      })
      .join('\n');
  }

  private validateWriterResult(result: ResearchWriterResult, query: string, results: SearchResult[]): ResearchWriterResult {
    // Ensure required fields are present and valid
    result.headline = result.headline || `Research Report: ${query}`;
    result.subtitle = result.subtitle || 'Comprehensive Analysis and Findings';
    result.short_summary = result.short_summary || `This research report provides a comprehensive analysis of ${query} based on current information and reliable sources.`;
    
    // Ensure markdown report is substantial
    if (!result.markdown_report || result.markdown_report.length < 200) {
      result.markdown_report = this.generateBasicReport(query, results);
    }

    // Ensure follow-up questions
    if (!result.follow_up_questions || result.follow_up_questions.length === 0) {
      result.follow_up_questions = [
        `What are the latest developments regarding ${query}?`,
        `How does ${query} impact different industries or areas?`,
        `What are the main challenges or opportunities with ${query}?`,
        `What future trends are predicted for ${query}?`,
        `How can one get started or learn more about ${query}?`
      ];
    }

    // Ensure citations
    if (!result.citations || result.citations.length === 0) {
      result.citations = results.slice(0, 5).map((result, _index) => ({
        text: `${result.title} - ${result.content.slice(0, 100)}...`,
        source: {
          title: result.title,
          url: result.url,
          snippet: result.content.slice(0, 200)
        }
      }));
    }

    return result;
  }

  private generateBasicReport(query: string, results: SearchResult[]): string {
    const sections = [
      `## Overview\n\nThis research report examines ${query} based on comprehensive analysis of current information and reliable sources.`,
      `## Key Findings\n\n${results.slice(0, 3).map((r, i) => `### ${i + 1}. ${r.title}\n\n${r.content.slice(0, 200)}...\n\n**Source**: [${r.title}](${r.url})`).join('\n\n')}`,
      `## Analysis\n\nBased on the research findings, ${query} represents a significant area of interest with multiple dimensions worth exploring. The available information suggests various perspectives and approaches to understanding this topic.`,
      `## Implications\n\nThe research reveals important implications for understanding ${query}. Further investigation may be warranted to explore specific aspects in greater detail.`,
      `## Conclusion\n\nThis analysis provides a foundational understanding of ${query} based on current available information. The topic warrants continued monitoring and research as new developments emerge.`
    ];

    return sections.join('\n\n');
  }

  private getFallbackReport(query: string, results: SearchResult[]): ResearchWriterResult {
    return {
      headline: `Research Report: ${query}`,
      subtitle: 'Comprehensive Analysis Based on Current Information',
      short_summary: `This research report provides an analysis of ${query} based on available sources and current information. The findings offer insights into various aspects of the topic.`,
      markdown_report: this.generateBasicReport(query, results),
      follow_up_questions: [
        `What are the latest developments regarding ${query}?`,
        `How does ${query} impact different industries?`,
        `What are the main challenges with ${query}?`,
        `What future trends are predicted for ${query}?`,
        `How can one learn more about ${query}?`
      ],
      citations: results.slice(0, 5).map((result) => ({
        text: `${result.title} - ${result.content.slice(0, 100)}...`,
        source: {
          title: result.title,
          url: result.url,
          snippet: result.content.slice(0, 200)
        }
      }))
    };
  }
}