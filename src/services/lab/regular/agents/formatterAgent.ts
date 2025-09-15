import { AgentResponse, Artifact } from '../../../../commonApp/types/index.ts';
import { logger } from '../../../../utils/logger.ts';

interface FormatterResponse {
  content: string;
}

export class LabFormatterAgent {
  constructor() {}

  async execute(artifact: Artifact): Promise<AgentResponse<FormatterResponse>> {
    try {
      logger.info('FormatterAgent: Starting content formatting', { 
        type: artifact.type,
        contentLength: artifact.content?.length || 0 
      });
      
      if (!artifact.content) {
        return {
          success: true,
          data: { content: 'No content to format.' }
        };
      }

      // Use Netlify function for OpenAI API call for advanced formatting
      const response = await fetch('/api/fetch-openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          input: [
            {
              role: 'system',
              content: 'You are a professional content formatter. Your task is to improve the formatting, structure, and presentation of content while maintaining its meaning and accuracy. Focus on proper Markdown formatting, clear headings, logical flow, and professional presentation. Do not change the core content, only improve its formatting and structure.'
            },
            {
              role: 'user',
              content: `Please format and improve the structure of this ${artifact.type}:\n\n${artifact.content}\n\nEnsure proper Markdown formatting, clear headings, and professional presentation while preserving all the original content.`
            }
          ],
          temperature: 0.2,
          max_completion_tokens: 1000
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const formattedContent = data.output_text || data.content;
        
        if (formattedContent && formattedContent.trim()) {
          logger.info('FormatterAgent: Formatting completed successfully');
          
          return {
            success: true,
            data: { content: formattedContent.trim() }
          };
        }
      }

      // Fallback: basic formatting cleanup
      const formattedContent = this.basicFormatting(artifact.content);
      logger.info('FormatterAgent: Using basic formatting fallback');
      
      return {
        success: true,
        data: { content: formattedContent }
      };
    } catch (error) {
      logger.error('FormatterAgent: Formatting failed', { 
        error: error instanceof Error ? error.message : error 
      });
      
      // Return original content if formatting fails
      return {
        success: true,
        data: { content: artifact.content || 'No content available.' }
      };
    }
  }

  private basicFormatting(content: string): string {
    // Basic formatting improvements
    let formatted = content;
    
    // Ensure proper spacing around headers
    formatted = formatted.replace(/\n(#{1,6})/g, '\n\n$1');
    formatted = formatted.replace(/(#{1,6}[^\n]+)\n([^#\n])/g, '$1\n\n$2');
    
    // Ensure proper spacing around lists
    formatted = formatted.replace(/\n([*-])/g, '\n\n$1');
    formatted = formatted.replace(/([*-][^\n]+)\n([^*\n-])/g, '$1\n\n$2');
    
    // Clean up multiple newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Ensure content starts and ends cleanly
    formatted = formatted.trim();
    
    return formatted;
  }
}