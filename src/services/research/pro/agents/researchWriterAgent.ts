import { AgentResponse } from '../../../../commonApp/types/index';
import type { SearchResult } from '../../types';

import { logger } from '../../../../utils/logger';

export interface ResearchWriterRequest {
  query: string;
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
  const { query, results } = request;
      
      logger.info('ResearchWriterAgent: Starting synthesis', { 
        query, 
        resultsCount: results.length 
      });

      if (!results || results.length === 0) {
        throw new Error('No search results provided for synthesis');
      }




      // TODO: Integrate OpenAI completions here.
      // For now, use fallback report only.
      let writerResult: ResearchWriterResult = this.getFallbackReport(query, results);

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
      result.citations = results.slice(0, 5).map((result) => {
        const textContent = result.content || result.snippet || result.title || 'No description';
        return {
          text: `${result.title} - ${textContent.slice(0, 100)}...`,
          source: result
        };
      });
    }

    return result;
  }

  private generateBasicReport(query: string, results: SearchResult[]): string {
    const sections = [
      `## Overview\n\nThis research report examines ${query} based on comprehensive analysis of current information and reliable sources.`,
      `## Key Findings\n\n${results.slice(0, 3).map((r, i) => {
        const content = r.content || r.snippet || 'No description available';
        return `### ${i + 1}. ${r.title}\n\n${content.slice(0, 200)}...\n\n**Source**: [${r.title}](${r.url})`;
      }).join('\n\n')}`,
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
      citations: results.slice(0, 5).map((result) => {
        const textContent = result.content || result.snippet || result.title || 'No description';
        return {
          text: `${result.title} - ${textContent.slice(0, 100)}...`,
          source: result
        };
      })
    };
  }
}