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


      // Use environment variable for OpenAI API endpoint, fallback to hardcoded URL
      const openaiApiUrl = import.meta.env.VITE_OPENAI_API_URL || 'VITE_OPENAI_API_URL';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseAnonKey) {
        throw new Error('Supabase anon key not found in environment variables');
      }

      const systemPrompt = 'You are a professional content formatter. Your task is to improve the formatting, structure, and presentation of content while maintaining its meaning and accuracy. Focus on proper Markdown formatting, clear headings, logical flow, and professional presentation. Do not change the core content, only improve its formatting and structure.';
      const userPrompt = `Please format and improve the structure of this ${artifact.type}:\n\n${artifact.content}\n\nEnsure proper Markdown formatting, clear headings, and professional presentation while preserving all the original content.`;

  const response = await fetch(openaiApiUrl, {
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

      if (response.ok) {
        const data = await response.json();
        let formattedContent: string | null = null;
        try {
          // Try to parse as JSON if the model returns a JSON string
          if (typeof data.text === 'string') {
            const parsed = JSON.parse(data.text);
            if (parsed && typeof parsed.formatted === 'string') {
              formattedContent = parsed.formatted;
            } else if (parsed && typeof parsed.content === 'string') {
              formattedContent = parsed.content;
            }
          }
        } catch (e) {
          // If not JSON, fallback to using the text directly
          formattedContent = typeof data.text === 'string' ? data.text : null;
          logger.warn('FormatterAgent: Failed to parse format response as JSON', { error: e, textPreview: String(data.text).slice(0, 100) });
        }
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
      logger.error('FormatterAgent: Formatting failed', { error: error instanceof Error ? error.message : error });
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