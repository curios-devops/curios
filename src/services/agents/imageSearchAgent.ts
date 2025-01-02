import { BaseAgent } from './baseAgent';
import { AgentResponse } from './types';
import { searchAcrossInstances } from '../searxService';
import { searchWithTavily } from '../tavilyService';
import { getFallbackResults } from '../fallbackService';
import { ImageResult } from '../types';

export class ImageSearchAgent extends BaseAgent {
  constructor() {
    super(
      'Image Search Agent',
      'Search and retrieve relevant images from multiple sources'
    );
  }

  async execute(query: string): Promise<AgentResponse> {
    try {
      const images = await this.searchImages(query);
      
      return {
        success: true,
        data: { images }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async searchImages(query: string): Promise<ImageResult[]> {
    const errors: string[] = [];
    let images: ImageResult[] = [];

    // Try Tavily first as it has better image support
    try {
      const tavilyResults = await searchWithTavily(query);
      images = [...images, ...tavilyResults.images];
    } catch (error) {
      errors.push(`Tavily images: ${error.message}`);
      
      // Try SearxNG as fallback
      try {
        const searxResults = await searchAcrossInstances(query);
        images = [...images, ...searxResults.images];
      } catch (error) {
        errors.push(`SearxNG images: ${error.message}`);
        
        // Try final fallback
        try {
          const fallbackResults = await getFallbackResults(query);
          images = [...images, ...fallbackResults.images];
        } catch (error) {
          errors.push(`Fallback images: ${error.message}`);
        }
      }
    }

    // Deduplicate and validate images
    const uniqueImages = new Map<string, ImageResult>();
    
    images.forEach(img => {
      if (img.url && !uniqueImages.has(img.url)) {
        try {
          new URL(img.url); // Validate URL
          uniqueImages.set(img.url, {
            url: img.url,
            alt: img.alt || '',
            source_url: img.source_url || img.url
          });
        } catch {
          // Skip invalid URLs
        }
      }
    });

    const validImages = Array.from(uniqueImages.values());
    console.log('Found valid images:', validImages.length); // Debug log

    return validImages;
  }

  protected getFallbackData(): ImageResult[] {
    return [];
  }
}