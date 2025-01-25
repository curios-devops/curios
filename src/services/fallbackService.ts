import axios from 'axios';
import { SearchResult, ImageResult } from './types';
import { FALLBACK_APIS, API_TIMEOUT } from './config';

const axiosInstance = axios.create({
  timeout: API_TIMEOUT,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'CuriosAI Search Bot/1.0',
  },
});

async function searchWikipedia(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  // Text search
  const searchResponse = await axiosInstance.get(FALLBACK_APIS.wikipedia, {
    params: {
      action: 'query',
      list: 'search',
      srsearch: query,
      format: 'json',
      utf8: 1,
      origin: '*',
    },
  });

  // Image search with prefixsearch and thumbnails
  const imageResponse = await axiosInstance.get(FALLBACK_APIS.wikipedia, {
    params: {
      action: 'query',
      format: 'json',
      prop: 'pageimages|pageterms',
      generator: 'prefixsearch',
      redirects: 1,
      formatversion: 2,
      piprop: 'thumbnail',
      pithumbsize: 250,
      pilimit: 20,
      wbptterms: 'description',
      gpssearch: query,
      gpslimit: 20,
      origin: '*',
    },
  });

  // Process text results
  const results = searchResponse.data.query.search
    .slice(0, 5)
    .map((result: any) => ({
      title: result.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
      content: result.snippet.replace(/<\/?[^>]+(>|$)/g, ''),
    }));

  // Process image results
  const images: ImageResult[] = [];
  
  // First try to get thumbnails from prefixsearch results
  if (imageResponse.data?.query?.pages) {
    const pages = Array.isArray(imageResponse.data.query.pages) 
      ? imageResponse.data.query.pages 
      : Object.values(imageResponse.data.query.pages);

    for (const page of pages) {
      if (page.thumbnail?.source) {
        try {
          const url = new URL(page.thumbnail.source);
          // Only add HTTPS images
          if (url.protocol === 'https:') {
            images.push({
              url: page.thumbnail.source,
              alt: page.title || query,
              source_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
            });
          }
        } catch {
          // Skip invalid URLs
          continue;
        }
      }
    }
  }

  // If we still need more images, try the images generator
  if (images.length < 10) {
    const additionalImagesResponse = await axiosInstance.get(FALLBACK_APIS.wikipedia, {
      params: {
        action: 'query',
        format: 'json',
        generator: 'images',
        gimlimit: 20,
        prop: 'imageinfo',
        iiprop: 'url|dimensions|mime',
        origin: '*',
        titles: query
      }
    });

    if (additionalImagesResponse.data?.query?.pages) {
      const pages = Object.values(additionalImagesResponse.data.query.pages);
      
      for (const page of pages) {
        if (page.imageinfo?.[0]?.url) {
          try {
            const url = new URL(page.imageinfo[0].url);
            // Only add HTTPS images and filter out SVGs/icons
            if (
              url.protocol === 'https:' && 
              page.imageinfo[0].mime?.startsWith('image/') &&
              !page.imageinfo[0].mime?.includes('svg') &&
              page.imageinfo[0].width >= 200 && 
              page.imageinfo[0].height >= 200
            ) {
              images.push({
                url: page.imageinfo[0].url,
                alt: page.title?.replace(/^File:/, '') || query,
                source_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`
              });
            }
          } catch {
            // Skip invalid URLs
            continue;
          }
        }
      }
    }
  }

  return { 
    results,
    // Deduplicate images by URL and take first 10
    images: Array.from(
      new Map(images.map(img => [img.url, img])).values()
    ).slice(0, 10)
  };
}

export async function getFallbackResults(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  try {
    const wikiResults = await searchWikipedia(query);
    if (wikiResults.results.length > 0 || wikiResults.images.length > 0) {
      return wikiResults;
    }
  } catch (error) {
    console.warn('Wikipedia search failed:', error);
  }

  // Return empty results if all fallbacks fail
  return {
    results: [],
    images: []
  };
}