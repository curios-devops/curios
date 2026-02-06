import { AgentResponse } from '../../../../commonApp/types/index.ts';
import { logger } from '../../../../utils/logger.ts';
import { searchWithTavily } from '../../../../commonService/searchTools/tavilyService.ts';

interface ResearchResponse {
  content: string;
  sources?: string[];
}

export class LabResearcherAgent {
  constructor() {}

  async execute(prompt: string, type: string): Promise<AgentResponse<ResearchResponse>> {
    try {
      logger.info('ResearcherAgent: Starting research', { prompt, type });

      // First, gather search results
      let searchResults = '';
      try {
        const searchResponse = await searchWithTavily(prompt);
        if (searchResponse.results?.length > 0) {
          searchResults = searchResponse.results.map((result: { title: string; url: string; snippet?: string }, index: number) => {
            return `${index + 1}. ${result.title}\n${result.url}\n${result.snippet || ''}\n`;
          }).join('\n');
        }
      } catch (searchError) {
        logger.warn('ResearcherAgent: Search failed, proceeding without search results', { 
          error: searchError instanceof Error ? searchError.message : searchError 
        });
      }

      // Prepare the prompts for the Supabase Edge Function
      const systemPrompt = `You are a research analyst. Your task is to analyze information and provide well-structured research findings. Format your response as a comprehensive research summary that will be used to create a ${type}. Focus on accuracy, relevance, and proper organization of information.`;
      const userPrompt = `Research topic: ${prompt}\n\nSearch Results:\n${searchResults || 'No search results available.'}\n\nPlease provide a comprehensive research summary covering key aspects, facts, and insights related to this topic.`;

      // Call the Supabase Edge Function for OpenAI completions
  const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
    ? import.meta.env.VITE_OPENAI_API_URL
    : 'VITE_OPENAI_API_URL';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseAnonKey) {
        throw new Error('Supabase anon key not found in environment variables');
      }

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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Research analysis request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      let researchContent = '';
      try {
        if (typeof data.text === 'string') {
          // Try to parse as JSON if the model returns a JSON string
          const parsed = JSON.parse(data.text);
          if (parsed && typeof parsed.content === 'string') {
            researchContent = parsed.content;
          } else if (typeof parsed === 'string') {
            researchContent = parsed;
          }
        }
      } catch (e) {
        researchContent = typeof data.text === 'string' ? data.text : '';
        logger.warn('ResearcherAgent: Failed to parse research response as JSON', { error: e, textPreview: String(data.text).slice(0, 100) });
      }
      if (!researchContent && data.content) {
        researchContent = data.content;
      }
      if (!researchContent) {
        researchContent = JSON.stringify(data);
      }

      if (researchContent && researchContent.trim()) {
        logger.info('ResearcherAgent: Research completed successfully', { 
          contentLength: researchContent.length 
        });
        return {
          success: true,
          data: {
            content: researchContent.trim(),
            sources: searchResults ? ['Tavily Search Results'] : []
          }
        };
      }

      // Fallback research
      const fallbackContent = this.createFallbackResearch(prompt, type);
      logger.info('ResearcherAgent: Using fallback research');
      return {
        success: true,
        data: { content: fallbackContent }
      };
    } catch (error) {
      logger.error('ResearcherAgent: Research failed', { error: error instanceof Error ? error.message : error });
      const fallbackContent = this.createFallbackResearch(prompt, type);
      return {
        success: true,
        data: { content: fallbackContent }
      };
    }
  }

  private createFallbackResearch(prompt: string, type: string): string {
    return `# Research Summary: ${prompt}\n\n## Overview\nThis ${type} focuses on ${prompt}. While specific research data is currently unavailable, the following general information provides a foundation for content creation.\n\n## Key Areas to Explore\n- Background information about ${prompt}\n- Current developments and trends\n- Important facts and figures\n- Relevant context and implications\n\n## Note\nThis is a fallback research summary. For more detailed and current information, please try again when research services are available.`;
  }
}