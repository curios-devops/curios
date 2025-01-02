import axios from 'axios';
import { SearchResult, ImageResult } from './types';
import { FALLBACK_APIS, API_TIMEOUT } from './config';

const axiosInstance = axios.create({
  timeout: API_TIMEOUT,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Snap Search Bot/1.0',
  },
});

async function searchDuckDuckGo(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  const response = await axiosInstance.get(FALLBACK_APIS.duckduckgo, {
    params: {
      q: query,
      format: 'json',
      no_html: 1,
      skip_disambig: 1,
      iax: 1,
      ia: 'images'
    },
  });

  const { AbstractText, AbstractURL, RelatedTopics, Image } = response.data;
  const results: SearchResult[] = [];
  const images: ImageResult[] = [];

  if (AbstractText && AbstractURL) {
    results.push({
      title: 'Summary',
      url: AbstractURL,
      content: AbstractText,
    });
  }

  RelatedTopics?.slice(0, 4).forEach((topic: any) => {
    if (topic.Text && topic.FirstURL) {
      results.push({
        title: topic.Text.split(' - ')[0],
        url: topic.FirstURL,
        content: topic.Text,
      });
    }
    if (topic.Icon?.URL) {
      images.push({
        url: topic.Icon.URL,
        alt: topic.Text || '',
        source_url: topic.FirstURL,
      });
    }
  });

  if (Image) {
    images.push({
      url: Image,
      alt: AbstractText || query,
      source_url: AbstractURL,
    });
  }

  return { results, images };
}

async function searchWikipedia(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  const [searchResponse, imageResponse] = await Promise.all([
    // Text search
    axiosInstance.get(FALLBACK_APIS.wikipedia, {
      params: {
        action: 'query',
        list: 'search',
        srsearch: query,
        format: 'json',
        utf8: 1,
        origin: '*',
      },
    }),
    // Image search
    axiosInstance.get(FALLBACK_APIS.wikipedia, {
      params: {
        action: 'query',
        generator: 'images',
        gimlimit: 10,
        prop: 'imageinfo',
        iiprop: 'url|dimensions',
        format: 'json',
        titles: query,
        origin: '*',
      },
    }),
  ]);

  const results = searchResponse.data.query.search.slice(0, 5).map((result: any) => ({
    title: result.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
    content: result.snippet.replace(/<\/?[^>]+(>|$)/g, ''),
  }));

  const images: ImageResult[] = [];
  if (imageResponse.data.query?.pages) {
    Object.values(imageResponse.data.query.pages).forEach((page: any) => {
      if (page.imageinfo?.[0]?.url) {
        images.push({
          url: page.imageinfo[0].url,
          alt: page.title || query,
          source_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        });
      }
    });
  }

  return { results, images };
}

export async function getFallbackResults(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  try {
    const duckResults = await searchDuckDuckGo(query);
    if (duckResults.results.length > 0) {
      return duckResults;
    }
  } catch (error) {
    console.error('DuckDuckGo search failed:', error);
  }

  try {
    const wikiResults = await searchWikipedia(query);
    if (wikiResults.results.length > 0) {
      return wikiResults;
    }
  } catch (error) {
    console.error('Wikipedia search failed:', error);
  }

  throw new Error('All fallback search methods failed');
}