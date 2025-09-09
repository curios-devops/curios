import { BaseAgent } from './baseAgent';
import { AgentResponse } from './types';
import { performRapidAPISearch } from '../searxService';
import { searchWithTavily } from '../tavilyService';
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
    const errors: Error[] = [];
    let images: ImageResult[] = [];

    // Try RapidAPI SearxNG first
    try {
      const result = await performRapidAPISearch(query);
      if (Array.isArray(result.images) && result.images.length > 0) {
        images = this.validateAndProcessImages(result.images);
        if (images.length > 0) return images;
      }
    } catch (error) {
      errors.push(error as Error);
    }

    // Try Tavily as first fallback
    try {
      const result = await searchWithTavily(query);
      if (Array.isArray(result.images) && result.images.length > 0) {
        images = this.validateAndProcessImages(result.images);
        if (images.length > 0) return images;
      }
    } catch (error) {
      errors.push(error as Error);
    }

    // If no images found, try with a more general query
    if (images.length === 0) {
      const generalQuery = this.generateGeneralQuery(query);
      try {
        const result = await performRapidAPISearch(generalQuery);
        if (Array.isArray(result.images) && result.images.length > 0) {
          images = this.validateAndProcessImages(result.images);
        }
      } catch (error) {
        errors.push(error as Error);
      }
    }

    // Log completion without error
    if (errors.length > 0) {
      console.log('Image search completed with fallbacks');
    }

    return images;
  }

  private generateGeneralQuery(query: string): string {
    return query
      .replace(/\d+/g, '')
      .replace(/['"]/g, '')
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 2)
      .join(' ') 
      .trim();
  }

  private validateAndProcessImages(images: ImageResult[]): ImageResult[] {
    const uniqueImages = new Map<string, ImageResult>();

    for (const img of images) {
      try {
        if (!img.url?.trim()) continue;

        const url = new URL(img.url);
        
        // Skip if not HTTPS
        if (url.protocol !== 'https:') continue;

        // Skip common invalid image patterns
        if (
          url.hostname.includes('placeholder') ||
          url.hostname.includes('example') ||
          url.pathname.includes('placeholder') ||
          url.pathname.includes('example')
        ) continue;

        // Add to unique images if not already present
        if (!uniqueImages.has(img.url)) {
          uniqueImages.set(img.url, {
            url: img.url,
            alt: img.alt?.trim() || '',
            source_url: img.source_url?.trim() || img.url
          });
        }
      } catch {
        continue;
      }
    }

    return Array.from(uniqueImages.values());
  }

  protected getFallbackData(): ImageResult[] {
    return [];
  }
}