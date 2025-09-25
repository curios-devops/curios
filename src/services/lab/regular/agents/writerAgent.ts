import { AgentResponse, Artifact, ArtifactStep } from '../../../../commonApp/types/index.ts';
import { logger } from '../../../../utils/logger.ts';

interface WriterResponse {
  content: string;
}

export class LabWriterAgent {
  constructor() {}

  async execute(prompt: string, type: string, artifact: Artifact): Promise<AgentResponse<WriterResponse>> {
    try {
      logger.info('WriterAgent: Starting content generation', { prompt, type });
      
      // Extract research content from completed steps
      let researchContent = '';
      const completedSteps = artifact.steps.filter((step: ArtifactStep) => step.status === 'complete' && step.result);
      if (completedSteps.length > 0) {
        researchContent = completedSteps
          .map((step: ArtifactStep) => step.result || '')
          .join('\n\n');
      }

  // Prepare prompts for chat completions
  const systemPrompt = this.getSystemPrompt(type);
  const userPrompt = `Task: ${prompt}\n\nResearch/Background:\n${researchContent || 'No specific research data provided.'}\n\nPlease create the requested ${type} based on this information.`;
      
      // Call the Supabase Edge Function using chat.completions API
  const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
    ? import.meta.env.VITE_OPENAI_API_URL
    : 'VITE_OPENAI_API_URL';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseAnonKey) {
        throw new Error('Supabase anon key not found in environment variables');
      }
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      const response = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          prompt: JSON.stringify({ messages })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Content generation request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`API error: ${data.error}`);
      }
      // Parse the response for content
      let content = '';
      try {
        if (typeof data.text === 'string') {
          const parsed = JSON.parse(data.text);
          if (parsed && typeof parsed.content === 'string') {
            content = parsed.content;
          } else if (typeof parsed === 'string') {
            content = parsed;
          }
        }
      } catch (e) {
        content = typeof data.text === 'string' ? data.text : '';
      }
      if (!content && data.content) {
        content = data.content;
      }
      if (!content) {
        content = data.output_text || '';
      }

      if (content && content.trim()) {
        logger.info('WriterAgent: Content generation completed successfully', { 
          contentLength: content.length 
        });
        
        return {
          success: true,
          data: { content: content.trim() }
        };
      }

      // Fallback content
      const fallbackContent = this.createFallbackContent(prompt, type, researchContent);
      logger.info('WriterAgent: Using fallback content');
      
      return {
        success: true,
        data: { content: fallbackContent }
      };
    } catch (error) {
      logger.error('WriterAgent: Content generation failed', { 
        error: error instanceof Error ? error.message : error 
      });
      
      const fallbackContent = this.createFallbackContent(prompt, type, '');
      return {
        success: true,
        data: { content: fallbackContent }
      };
    }
  }

  private getSystemPrompt(type: string): string {
    switch (type) {
      case 'doc':
        return 'You are a professional document writer. Create well-structured, informative documents in Markdown format with clear headings, proper formatting, and comprehensive content. Use proper Markdown syntax including headers, lists, and emphasis where appropriate.';
      case 'biography':
        return 'You are a skilled biography writer. Create engaging, well-researched biographical content that tells a compelling story while maintaining accuracy and respect. Use Markdown formatting with clear sections covering early life, career, achievements, and legacy.';
      case 'article':
        return 'You are a professional article writer. Create engaging, informative articles with clear structure, compelling headlines, and well-organized content. Use Markdown formatting with proper headings, subheadings, and formatting for readability.';
      case 'blog':
        return 'You are a blog content creator. Write engaging, conversational blog posts that connect with readers while providing valuable information. Use Markdown formatting with attention-grabbing headings and reader-friendly structure.';
      case 'report':
        return 'You are a professional report writer. Create detailed, analytical reports with clear structure, data-driven insights, and professional presentation. Use Markdown formatting with executive summary, findings, and recommendations sections.';
      default:
        return 'You are a skilled content creator. Generate well-structured, high-quality content in Markdown format that meets the user\'s requirements. Use appropriate formatting, clear organization, and engaging presentation.';
    }
  }

  private createFallbackContent(prompt: string, type: string, researchContent: string): string {
    const title = prompt.slice(0, 60);
    const research = researchContent || 'No specific research data was available.';
    
    switch (type) {
      case 'doc':
        return `# ${title}\n\n## Overview\n\nThis document covers ${prompt}.\n\n## Background\n\n${research}\n\n## Key Points\n\n- Important information about ${prompt}\n- Relevant details and context\n- Additional considerations\n\n## Conclusion\n\nThis document provides a comprehensive overview of ${prompt}. For more detailed information, additional research may be required.\n\n---\n\n*This document was generated as a starting point. Please review and enhance as needed.*`;
      
      case 'biography':
        return `# ${title}\n\n## Early Life\n\nInformation about the early life and background of ${prompt}.\n\n## Career and Achievements\n\n${research}\n\n## Legacy\n\nThe lasting impact and significance of ${prompt}.\n\n---\n\n*This biography provides a basic framework. Additional research and verification of facts is recommended.*`;
      
      default:
        return `# ${title}\n\n${research}\n\n---\n\n*This content was generated as a fallback. Please try again for more detailed and accurate information.*`;
    }
  }
}