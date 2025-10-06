
import { useState } from 'react';
import { braveSearchTool } from '../commonService/searchTools/braveSearchTool';

const SUPABASE_URL = 'https://gpfccicfqynahflehpqo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNDIyMDYsImV4cCI6MjA1MDcxODIwNn0.wLnIXxThhq144sQpUFzLd_ifimgr1oetMwvchDmMF84';

export default function TestEdgeFunctions() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTest = async (type: 'key' | 'openai' | 'brave' | 'brave-multi' | 'apify' | 'apify-images' | 'searxng' | 'tavily' | 'brave-agent') => {
    if (type === 'brave-agent') {
      setLoading(true);
      setResult('Testing braveSearchTool with query "Cat"...\n\nCheck console for detailed logs.');
      try {
        console.log('🧪 [TEST] Starting braveSearchTool("Cat")...');
        const braveResult = await braveSearchTool('Cat');
        
        console.log('🧪 [TEST] Result received:', {
          webCount: braveResult.web?.length || 0,
          imagesCount: braveResult.images?.length || 0,
          newsCount: braveResult.news?.length || 0,
          videosCount: braveResult.videos?.length || 0,
          firstWebTitle: braveResult.web?.[0]?.title || 'NONE',
          firstImageUrl: braveResult.images?.[0]?.url || 'NONE'
        });
        
        // Show only first 4 results of each type for readability
        const simplifiedResult = {
          web: braveResult.web?.slice(0, 4) || [],
          images: braveResult.images?.slice(0, 4) || [],
          news: braveResult.news?.slice(0, 4) || [],
          videos: braveResult.videos?.slice(0, 4) || [],
          counts: {
            web: braveResult.web?.length || 0,
            images: braveResult.images?.length || 0,
            news: braveResult.news?.length || 0,
            videos: braveResult.videos?.length || 0
          }
        };
        
        setResult('✅ braveSearchTool("Cat") SUCCESS!\n\nFirst 4 results of each type:\n' + JSON.stringify(simplifiedResult, null, 2));
      } catch (err) {
        console.error('🧪 [TEST] Error:', err);
        setResult('❌ braveSearchTool("Cat") ERROR:\n' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setResult('');
    try {
      let res, text, data;
      if (type === 'key') {
        res = await fetch(`${SUPABASE_URL}/functions/v1/test-openai-key`, {
          headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        text = await res.text();
        data = JSON.parse(text);
        setResult(data.apiKey ? `OPENAI_API_KEY is available:\n${data.apiKey}` : `OPENAI_API_KEY not found.\n${JSON.stringify(data, null, 2)}`);
      } else if (type === 'openai') {
        res = await fetch(`${SUPABASE_URL}/functions/v1/fetch-openai`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: 'Write a one-sentence bedtime story about a unicorn.' })
        });
        text = await res.text();
        data = JSON.parse(text);
        setResult(data.text ? `OpenAI response:\n${data.text}` : `OpenAI call failed.\n${JSON.stringify(data, null, 2)}`);
      } else if (type === 'brave') {
        res = await fetch(`${SUPABASE_URL}/functions/v1/brave-web-search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: 'cat' })
        });
        text = await res.text();
        data = JSON.parse(text);
        setResult(`Brave Web Search (text only) response:\n${JSON.stringify(data, null, 2)}`);
      } else if (type === 'brave-multi') {
        // Test brave-search function (returns web, images, news, videos)
        res = await fetch(`${SUPABASE_URL}/functions/v1/brave-search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            query: 'dog',
            types: ['web', 'images', 'news', 'videos']
          })
        });
        text = await res.text();
        data = JSON.parse(text);
        
        // Format results summary
        const summary = {
          query: data.query,
          webResults: data.results?.web?.results?.length || 0,
          imageResults: data.results?.images?.results?.length || 0,
          newsResults: data.results?.news?.results?.length || 0,
          videoResults: data.results?.videos?.results?.length || 0,
          errors: data.errors,
          fullResponse: data
        };
        
        setResult(`Brave Multi-Type Search (web + images + news + videos) response:\n${JSON.stringify(summary, null, 2)}`);
      } else if (type === 'apify') {
        // Test Apify search with client-side implementation (similar to Brave)
        try {
          setResult('Hello World! Testing Apify Google Search for "cat"...\n\nStarting actor...');
          
          const apiKey = import.meta.env.VITE_APIFY_API_KEY;
          if (!apiKey?.trim()) {
            throw new Error('Apify API key is missing');
          }

          // Call Apify Google Search Scraper actor with waitForFinish
          const runResponse = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              queries: 'cat',
              resultsPerPage: 10,
              maxPagesPerQuery: 1,
              languageCode: 'en',
              countryCode: 'us',
              mobileResults: false,
              includeUnfilteredResults: false
            })
          });

          if (!runResponse.ok) {
            const errorText = await runResponse.text();
            throw new Error(`Apify API error: ${runResponse.status} ${runResponse.statusText}\n${errorText}`);
          }

          const results = await runResponse.json();
          
          // Apify returns an array where each item has organicResults array
          // Extract organic results from the first search page
          const organicResults = results[0]?.organicResults || [];
          
          // Format results similar to Brave search format
          const formattedResults = {
            organic: organicResults.slice(0, 10).map((item: any, index: number) => ({
              title: item.title || 'No title',
              url: item.url || item.link || '',
              description: item.description || item.snippet || '',
              rank: index + 1
            })),
            totalResults: organicResults.length,
            query: 'cat',
            searchInformation: results[0]?.searchQuery || {}
          };
          
          setResult(`Apify Search Hello World response for "cat":\n${JSON.stringify(formattedResults, null, 2)}`);
        } catch (err) {
          setResult('Apify test error: ' + (err instanceof Error ? err.message : err));
        }
      } else if (type === 'apify-images') {
        // Test Apify with parallel text + image search (like retriever agent)
        try {
          setResult('Hello World! Testing Apify with images for "cute cats"...\n\nSearching...');
          
          const apiKey = import.meta.env.VITE_APIFY_API_KEY;
          if (!apiKey?.trim()) {
            throw new Error('Apify API key is missing');
          }

          const query = 'cute cats';

          // Text search
          const textSearchPromise = fetch(
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
                includeUnfilteredResults: false
              })
            }
          );

          // Image search
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
                searchType: 'images'
              })
            }
          );

          const [textResponse, imageResponse] = await Promise.all([
            textSearchPromise,
            imageSearchPromise
          ]);

          if (!textResponse.ok) {
            const errorText = await textResponse.text();
            throw new Error(`Apify text search error: ${textResponse.status}\n${errorText}`);
          }

          const textResults = await textResponse.json();
          const organicResults = textResults[0]?.organicResults || [];

          let imageResults = [];
          if (imageResponse.ok) {
            const imgResults = await imageResponse.json();
            const imgData = imgResults[0]?.imageResults || imgResults[0]?.organicResults || [];
            imageResults = imgData.slice(0, 10).map((img: any) => ({
              imageUrl: img.imageUrl || img.image || img.url || '',
              title: img.title || img.alt || 'Image',
              pageUrl: img.pageUrl || img.source || img.link || ''
            })).filter((img: any) => img.imageUrl !== '');
          }

          const formattedResults = {
            textResults: organicResults.slice(0, 10).map((item: any) => ({
              title: item.title || 'No title',
              url: item.url || '',
              description: item.description || ''
            })),
            imageResults: imageResults,
            query,
            textCount: organicResults.length,
            imageCount: imageResults.length
          };

          setResult(`Apify with Images response for "${query}":\n${JSON.stringify(formattedResults, null, 2)}`);
        } catch (err) {
          setResult('Apify images test error: ' + (err instanceof Error ? err.message : err));
        }
      } else if (type === 'searxng') {
        // Test SearxNG search directly through RapidAPI (similar to Brave/Apify)
        try {
          setResult('Hello World! Testing SearxNG search for "dog"...\n\nSearching...');
          
          const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;
          if (!rapidApiKey?.trim()) {
            throw new Error('RapidAPI key is missing');
          }

          const response = await fetch('https://searx-search-api.p.rapidapi.com/search?q=dog&format=json&safesearch=1&engines=google,bing,duckduckgo,brave&pageno=1&count=10&language=en-US&categories=general', {
            method: 'GET',
            headers: {
              'x-rapidapi-key': rapidApiKey,
              'x-rapidapi-host': 'searx-search-api.p.rapidapi.com'
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`SearxNG API error: ${response.status} ${response.statusText}\n${errorText}`);
          }

          const data = await response.json();
          
          // Format results similar to Brave/Apify format
          const organicResults = Array.isArray(data.results) ? data.results : [];
          const formattedResults = {
            organic: organicResults.slice(0, 10).map((item: any, index: number) => ({
              title: item.title || 'No title',
              url: item.url || '',
              description: item.content || '',
              rank: index + 1
            })),
            totalResults: organicResults.length,
            query: 'dog',
            suggestions: data.suggestions || []
          };
          
          setResult(`SearxNG Search Hello World response for "dog":\n${JSON.stringify(formattedResults, null, 2)}`);
        } catch (err) {
          setResult('SearxNG test error: ' + (err instanceof Error ? err.message : err));
        }
      } else if (type === 'tavily') {
        // Test Tavily search directly through the search service
        try {
          // Import and use the tavilySearch function
          const { tavilySearch } = await import('../commonService/searchTools/tavily.ts');
          setResult('Hello World! Testing Tavily search for "cat"...\n\nSearching...');
          
          const searchResults = await tavilySearch('cat');
          setResult(`Tavily Search Hello World response for "cat":\n${JSON.stringify(searchResults, null, 2)}`);
        } catch (err) {
          setResult('Tavily test error: ' + (err instanceof Error ? err.message : err));
        }
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', margin: '2em' }}>
      <h2>Test Supabase Edge Functions (React)</h2>
      <div style={{ marginBottom: '1em' }}>
        <button onClick={() => handleTest('key')} disabled={loading} style={{ marginRight: 8, marginBottom: 8 }}>Test OPENAI_API_KEY</button>
        <button onClick={() => handleTest('openai')} disabled={loading} style={{ marginRight: 8, marginBottom: 8 }}>Test OpenAI Call</button>
      </div>
      <div style={{ marginBottom: '1em' }}>
        <button onClick={() => handleTest('brave')} disabled={loading} style={{ marginRight: 8, marginBottom: 8 }}>Test Brave Web Search (text only)</button>
        <button onClick={() => handleTest('brave-multi')} disabled={loading} style={{ marginRight: 8, marginBottom: 8 }}>Test Brave Multi-Type (web+images+news+videos)</button>
      </div>
      <div style={{ marginBottom: '1em' }}>
        <button onClick={() => handleTest('apify')} disabled={loading} style={{ marginRight: 8, marginBottom: 8 }}>Test Apify Search (cat)</button>
        <button onClick={() => handleTest('apify-images')} disabled={loading} style={{ marginRight: 8, marginBottom: 8 }}>Test Apify with Images (cute cats)</button>
      </div>
      <div style={{ marginBottom: '1em' }}>
        <button onClick={() => handleTest('searxng')} disabled={loading} style={{ marginRight: 8, marginBottom: 8 }}>Test SearxNG Search (dog)</button>
        <button onClick={() => handleTest('tavily')} disabled={loading} style={{ marginBottom: 8 }}>Test Tavily Search (cat)</button>
      </div>
  <button onClick={() => handleTest('brave-agent')} disabled={loading} style={{ marginRight: 8, marginBottom: 8, background: '#e0f7fa' }}>Test braveSearchTool ("Cat") [Agent Format]</button>
  <pre style={{ marginTop: '1em', padding: '1em', background: '#f6f6f6', borderRadius: 6, overflow: 'auto', maxHeight: '600px' }}>{result}</pre>
    </div>
  );
}
