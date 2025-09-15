import type { SearchResult } from './searchTools';
import { logger } from '../../../utils/logger.ts';

// This is a server-side only module
const isServer = typeof window === 'undefined';

// Type for the Apify client
interface ApifyClientType {
  actor: (id: string) => {
    call: (input: Record<string, unknown>) => Promise<{ defaultDatasetId: string }>;
  };
  dataset: (id: string) => {
    listItems: () => Promise<{ items: Array<{ title?: string; url?: string; description?: string; rank?: number }> }>;
  };
}

interface ApifySearchOptions {
  queries: string | string[];
  resultsPerPage?: number;
  maxPagesPerQuery?: number;
  apiKey: string;
}

export class ApifySearchTool {
  private client: ApifyClientType | null = null;
  private apiKey: string;
  private initialized: boolean = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (!isServer) {
      throw new Error('ApifySearchTool can only be used on the server side');
    }
    this.initialize();
  }

  private async initialize() {
    if (isServer && !this.initialized && this.apiKey) {
      try {
        const { ApifyClient } = await import('apify-client');
        this.client = new ApifyClient({ token: this.apiKey }) as unknown as ApifyClientType;
        this.initialized = true;
      } catch (error) {
        logger.error('Failed to initialize Apify client:', error instanceof Error ? error.message : 'Unknown error');
        this.client = null;
      }
    }
  }

  async search(options: ApifySearchOptions): Promise<SearchResult[]> {
    if (!this.client) {
      logger.warn('Apify client not initialized');
      return [];
    }
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!isServer) {
      logger.warn('Apify search is only available on the server side');
      return [];
    }

    try {
      if (!this.client) {
        throw new Error('Apify client not initialized');
      }

      const input = {
        queries: Array.isArray(options.queries) ? options.queries.join('\n') : options.queries,
        resultsPerPage: options.resultsPerPage || 10,
        maxPagesPerQuery: options.maxPagesPerQuery || 1,
      };

      logger.info('Running Apify search with queries:', { queries: input.queries });
      
      const run = await this.client.actor('apify/google-search-scraper').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
      
      return items.map((item) => ({
        title: item.title || '',
        url: item.url || '',
        content: item.description || '',
        source: 'apify',
        score: item.rank ? 1 - (item.rank / 100) : 0.5, // Convert rank to score (0-1)
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Apify search failed:', errorMessage);
      throw new Error(`Apify search failed: ${errorMessage}`);
    }
  }
}
