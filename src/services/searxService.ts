import axios from 'axios';
import { SearchResult, ImageResult } from './types';
import { SEARX_INSTANCES, RETRY_OPTIONS, API_TIMEOUT, MAX_RESULTS } from './config';
import { withRetry, sanitizeResponse } from './utils';
import { updateInstanceHealth, getHealthyInstances } from './instanceHealth';

interface SearxResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    snippet?: string;
    img_src?: string;
    thumbnail_src?: string;
    engine?: string;
    score?: number;
  }>;
  answers?: string[];
  corrections?: string[];
  infoboxes?: any[];
  suggestions?: string[];
  unresponsive_engines?: string[];
}

const axiosInstance = axios.create({
  timeout: API_TIMEOUT,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; Snap/1.0; +https://snap.example.com)',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
});

async function querySingleInstance(
  query: string,
  instance: string,
  attempt: number = 0
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  try {
    console.log(`Querying ${instance} (attempt ${attempt + 1})...`);

    const [textResponse, imageResponse] = await Promise.all([
      // Regular search
      axiosInstance.get<SearxResponse>(`${instance}/search`, {
        params: {
          q: query,
          format: 'json',
          language: 'en',
          categories: 'general',
          time_range: 'year',
          engines: 'google,bing,duckduckgo,wikipedia',
          safesearch: 1
        }
      }),
      // Image search
      axiosInstance.get<SearxResponse>(`${instance}/search`, {
        params: {
          q: query,
          format: 'json',
          language: 'en',
          categories: 'images',
          time_range: 'year',
          engines: 'google images,bing images,duckduckgo images',
          safesearch: 1
        }
      })
    ]);

    const textData = sanitizeResponse(textResponse.data);
    const imageData = sanitizeResponse(imageResponse.data);

    if (!textData?.results || !Array.isArray(textData.results)) {
      throw new Error('Invalid response format from search instance');
    }

    // Process text results
    const results = textData.results
      .filter(result => 
        result.title?.trim() && 
        result.url?.trim() && 
        (result.content?.trim() || result.snippet?.trim()) &&
        result.score && result.score > 0.5 // Only include results with good relevance
      )
      .map(result => ({
        title: String(result.title).trim(),
        url: String(result.url).trim(),
        content: String(result.content || result.snippet).trim(),
      }))
      .slice(0, MAX_RESULTS);

    // Process image results
    const images = (imageData?.results || [])
      .filter(result => {
        try {
          // Validate image URLs
          new URL(result.img_src || result.thumbnail_src || '');
          return true;
        } catch {
          return false;
        }
      })
      .map(result => ({
        url: String(result.img_src || result.thumbnail_src).trim(),
        alt: String(result.title || query).trim(),
        source_url: String(result.url || '').trim()
      }))
      .slice(0, MAX_RESULTS * 2); // Get more images for the photo grid

    // Update instance health
    updateInstanceHealth(instance, true);

    console.log(`${instance} returned ${results.length} results and ${images.length} images`);
    return { results, images };
  } catch (error) {
    console.warn(`SearxNG instance ${instance} failed:`, error);
    updateInstanceHealth(instance, false);
    throw error;
  }
}

export async function searchAcrossInstances(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  const errors: string[] = [];
  
  // Get list of healthy instances
  const healthyInstances = await getHealthyInstances();
  const instances = healthyInstances.length > 0 ? healthyInstances : SEARX_INSTANCES;
  
  // Shuffle instances for load balancing
  const shuffledInstances = [...instances].sort(() => Math.random() - 0.5);
  
  for (const instance of shuffledInstances) {
    for (let attempt = 0; attempt < RETRY_OPTIONS.maxRetries; attempt++) {
      try {
        const { results, images } = await querySingleInstance(query, instance, attempt);
        
        if (results.length > 0 || images.length > 0) {
          return { results, images };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${instance} (attempt ${attempt + 1}): ${errorMessage}`);
        
        if (attempt < RETRY_OPTIONS.maxRetries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, RETRY_OPTIONS.delayMs * Math.pow(2, attempt))
          );
        }
        continue;
      }
    }
  }

  throw new Error(`All SearxNG instances failed:\n${errors.join('\n')}`);
}