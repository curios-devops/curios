// Web Crawler for Multi-Agent Researcher
// Provides content extraction capabilities using browser automation

import { logger } from '../../utils/logger';

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  summary: string;
  keyPoints: string[];
  metadata: {
    wordCount: number;
    extractedAt: Date;
    success: boolean;
    error?: string;
  };
}

export interface CrawlOptions {
  timeout?: number;
  maxContentLength?: number;
  extractImages?: boolean;
  followRedirects?: boolean;
}

class WebCrawlerService {
  private static instance: WebCrawlerService;
  private crawlHistory: CrawlResult[] = [];

  static getInstance(): WebCrawlerService {
    if (!WebCrawlerService.instance) {
      WebCrawlerService.instance = new WebCrawlerService();
    }
    return WebCrawlerService.instance;
  }

  async crawlUrl(url: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    const {
      timeout = 10000,
      maxContentLength = 50000,
      extractImages = false,
      followRedirects = true
    } = options;

    logger.info(`Crawling URL: ${url}`);

    try {
      // For now, we'll use fetch API with some basic content extraction
      // In a production environment, this would use Playwright or Puppeteer
      const crawlResult = await this.fetchAndExtractContent(url, {
        timeout,
        maxContentLength,
        extractImages,
        followRedirects
      });

      this.addToHistory(crawlResult);
      return crawlResult;
    } catch (error) {
      logger.error(`Failed to crawl ${url}:`, error);
      
      // Return error result
      const errorResult: CrawlResult = {
        url,
        title: 'Failed to extract title',
        content: '',
        summary: 'Content extraction failed',
        keyPoints: [],
        metadata: {
          wordCount: 0,
          extractedAt: new Date(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      this.addToHistory(errorResult);
      return errorResult;
    }
  }

  async crawlMultipleUrls(urls: string[], options: CrawlOptions = {}): Promise<CrawlResult[]> {
    logger.info(`Crawling ${urls.length} URLs`);
    
    // Limit concurrent crawls to avoid overwhelming servers
    const batchSize = 3;
    const results: CrawlResult[] = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url, index) => {
        // Stagger requests slightly
        await new Promise(resolve => setTimeout(resolve, index * 1000));
        return this.crawlUrl(url, options);
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error(`Failed to crawl ${batch[index]}:`, result.reason);
          results.push({
            url: batch[index],
            title: 'Crawl failed',
            content: '',
            summary: 'Failed to extract content',
            keyPoints: [],
            metadata: {
              wordCount: 0,
              extractedAt: new Date(),
              success: false,
              error: result.reason?.message || 'Unknown error'
            }
          });
        }
      });
    }

    return results;
  }

  private async fetchAndExtractContent(
    url: string, 
    options: CrawlOptions
  ): Promise<CrawlResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: options.followRedirects ? 'follow' : 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CuriosResearcher/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      const html = await response.text();
      return this.extractContentFromHtml(url, html, options);

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${options.timeout}ms`);
      }
      
      throw error;
    }
  }

  private extractContentFromHtml(
    url: string, 
    html: string, 
    options: CrawlOptions
  ): CrawlResult {
    // Basic HTML content extraction
    // In production, this would use a proper HTML parser like cheerio or jsdom
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? this.cleanText(titleMatch[1]) : 'No title found';

    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i);
    const metaDescription = metaDescMatch ? this.cleanText(metaDescMatch[1]) : '';

    // Remove script and style tags
    let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove HTML tags and extract text content
    const textContent = cleanHtml.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit content length
    const content = options.maxContentLength 
      ? textContent.slice(0, options.maxContentLength) 
      : textContent;

    // Generate summary (first few sentences or meta description)
    const summary = metaDescription || this.generateSummary(content);

    // Extract key points (simplified - would use NLP in production)
    const keyPoints = this.extractKeyPoints(content);

    return {
      url,
      title,
      content,
      summary,
      keyPoints,
      metadata: {
        wordCount: content.split(/\s+/).length,
        extractedAt: new Date(),
        success: true
      }
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateSummary(content: string): string {
    // Extract first few sentences as summary
    const sentences = content.match(/[^\.!?]+[\.!?]+/g) || [];
    const summary = sentences.slice(0, 3).join(' ').trim();
    
    return summary.length > 200 
      ? summary.slice(0, 200) + '...' 
      : summary || 'No summary available';
  }

  private extractKeyPoints(content: string): string[] {
    // Simple key point extraction - would use NLP in production
    const sentences = content.match(/[^\.!?]+[\.!?]+/g) || [];
    
    // Look for sentences with key indicators
    const keyPointIndicators = [
      'important', 'key', 'significant', 'main', 'primary', 
      'essential', 'critical', 'major', 'fundamental', 'core'
    ];
    
    const keyPoints = sentences
      .filter(sentence => 
        keyPointIndicators.some(indicator => 
          sentence.toLowerCase().includes(indicator)
        )
      )
      .slice(0, 5)
      .map(point => point.trim());

    // If no key points found, return first few sentences
    if (keyPoints.length === 0) {
      return sentences.slice(0, 3).map(s => s.trim());
    }

    return keyPoints;
  }

  private addToHistory(result: CrawlResult): void {
    this.crawlHistory.push(result);
    // Keep only last 100 crawls
    if (this.crawlHistory.length > 100) {
      this.crawlHistory = this.crawlHistory.slice(-100);
    }
  }

  getCrawlHistory(): CrawlResult[] {
    return [...this.crawlHistory];
  }

  getSuccessfulCrawls(): CrawlResult[] {
    return this.crawlHistory.filter(result => result.metadata.success);
  }

  clearHistory(): void {
    this.crawlHistory = [];
  }

  // Advanced crawling methods
  async smartCrawl(urls: string[]): Promise<CrawlResult[]> {
    // Prioritize URLs based on domain reputation and relevance
    const prioritizedUrls = this.prioritizeUrls(urls);
    
    // Crawl with adaptive timeout based on domain
    const results = await Promise.all(
      prioritizedUrls.map(async ({ url, priority }) => {
        const timeout = this.getAdaptiveTimeout(url, priority);
        return this.crawlUrl(url, { timeout });
      })
    );

    return results;
  }

  private prioritizeUrls(urls: string[]): Array<{ url: string; priority: number }> {
    const domainScores: Record<string, number> = {
      'wikipedia.org': 10,
      'github.com': 9,
      'arxiv.org': 9,
      'nature.com': 8,
      'sciencedirect.com': 8,
      'ieee.org': 8,
      'acm.org': 8,
      'springer.com': 7,
      'mit.edu': 9,
      'stanford.edu': 9,
      'harvard.edu': 9,
      'cambridge.org': 7,
      'oxford.ac.uk': 7
    };

    return urls.map(url => {
      try {
        const domain = new URL(url).hostname.toLowerCase();
        const priority = domainScores[domain] || 5; // Default priority
        return { url, priority };
      } catch {
        return { url, priority: 1 }; // Low priority for invalid URLs
      }
    }).sort((a, b) => b.priority - a.priority);
  }

  private getAdaptiveTimeout(_url: string, priority: number): number {
    // Higher priority domains get more time
    const baseTimeout = 10000; // 10 seconds
    const priorityMultiplier = Math.max(0.5, priority / 10);
    return Math.floor(baseTimeout * priorityMultiplier);
  }
}

// Export singleton instance
export const webCrawler = WebCrawlerService.getInstance();

// Export convenience functions
export async function crawlUrl(url: string, options?: CrawlOptions): Promise<CrawlResult> {
  return webCrawler.crawlUrl(url, options);
}

export async function crawlUrls(urls: string[], options?: CrawlOptions): Promise<CrawlResult[]> {
  return webCrawler.crawlMultipleUrls(urls, options);
}

export async function smartCrawl(urls: string[]): Promise<CrawlResult[]> {
  return webCrawler.smartCrawl(urls);
}
