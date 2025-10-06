// apifySearchTool.ts
// Apify Google Search wrapper for text + image results
// Returns: { web, images }

import { logger } from '../../utils/logger';
import type { SearxResult, ImageResult } from '../../types';

export interface ApifySearchResults {
  web: SearxResult[];
  images: ImageResult[];
}

/**
 * Apify Google Search - Parallel text + image search
 * @param query Search query string
 * @returns Formatted search results with text and images
 */
export async function apifySearchTool(query: string): Promise<ApifySearchResults> {
  logger.info('Apify Search Tool: Starting', { query });
  
  const apiKey = import.meta.env.VITE_APIFY_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('Apify API key is missing');
  }

  // Run two searches in parallel: text results + image results
  // This matches how Google Search works (text search, then click Images tab)
  const textSearchPromise = fetch(
    `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: query,
        resultsPerPage: 10, // Google limit per page
        maxPagesPerQuery: 1,
        languageCode: 'en',
        countryCode: 'us',
        mobileResults: false,
        includeUnfilteredResults: false
      })
    }
  );

  // Separate image search using Google Images
  const imageSearchPromise = fetch(
    `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: query,
        resultsPerPage: 10,
        maxPagesPerQuery: 1,
        languageCode: 'en',
        countryCode: 'us',
        mobileResults: false,
        includeUnfilteredResults: false,
        searchType: 'images' // Tell Google to search images
      })
    }
  );

  // Wait for both searches
  const [textResponse, imageResponse] = await Promise.all([
    textSearchPromise,
    imageSearchPromise
  ]);

  if (!textResponse.ok) {
    const errorText = await textResponse.text();
    throw new Error(`Apify text search error: ${textResponse.status} - ${errorText}`);
  }

  const textResults = await textResponse.json();
  const organicResults = textResults[0]?.organicResults || [];
  
  // Extract images from image search
  let imageResults: ImageResult[] = [];
  if (imageResponse.ok) {
    try {
      const imgResults = await imageResponse.json();
      
      logger.info('Apify image response structure', {
        hasResults: !!imgResults,
        firstItemKeys: imgResults[0] ? Object.keys(imgResults[0]) : [],
        hasImageResults: !!imgResults[0]?.imageResults,
        hasOrganicResults: !!imgResults[0]?.organicResults,
        sampleData: imgResults[0] ? JSON.stringify(imgResults[0]).substring(0, 200) : 'none'
      });
      
      // Try multiple paths to find image data
      const imgData = 
        imgResults[0]?.imageResults || 
        imgResults[0]?.organicResults || 
        imgResults[0]?.images ||
        [];
      
      if (imgData.length > 0) {
        // Log first image structure to understand format
        logger.info('First image structure', {
          keys: Object.keys(imgData[0]),
          sample: JSON.stringify(imgData[0]).substring(0, 300)
        });
        
        imageResults = imgData.slice(0, 10).map((img: any) => {
          // Try multiple field names that Apify might use
          const imageUrl = 
            img.imageUrl || 
            img.thumbnailUrl ||
            img.thumbnail ||
            img.image?.url ||
            img.image ||
            img.url ||
            '';
          
          return {
            url: imageUrl,
            alt: img.title || img.alt || img.description || 'Search result image',
            source_url: img.pageUrl || img.sourceUrl || img.source || img.link || img.url || ''
          };
        }).filter((img: ImageResult) => img.url && img.url.startsWith('http'));
        
        logger.info('Apify image search successful', {
          rawImagesCount: imgData.length,
          filteredImagesCount: imageResults.length,
          sampleUrl: imageResults[0]?.url || 'none'
        });
      } else {
        logger.warn('Apify image search returned no image data');
      }
    } catch (imgError) {
      logger.error('Apify image search parsing failed', {
        error: imgError instanceof Error ? imgError.message : imgError
      });
    }
  }
  
  logger.info('Apify Search Tool: Success', {
    webCount: organicResults.length,
    imagesCount: imageResults.length
  });

  return {
    web: organicResults.slice(0, 10).map((item: any) => ({
      title: item.title || 'No title',
      url: item.url || item.link || '',
      content: item.description || item.snippet || ''
    })),
    images: imageResults
  };
}
