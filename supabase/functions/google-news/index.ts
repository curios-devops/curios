// Supabase Edge Function for SERP API Google News
// This function handles SERP API calls server-side to keep API key secure

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface GoogleNewsRequest {
  query?: string // Optional search query, defaults to general news
}

interface NewsArticle {
  title: string
  link: string
  snippet: string
  date: string
  source: string
  thumbnail?: string
}

interface SerpApiNewsResult {
  title?: string
  link?: string
  snippet?: string
  date?: string
  source?: {
    name?: string
  }
  thumbnail?: string
  image_url?: string
}

interface SerpApiResponse {
  news_results?: SerpApiNewsResult[]
  search_information?: {
    status?: string
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📰 [GOOGLE NEWS] Edge Function called')

    // Get SERP API key from environment. News has its own key/account
    // (SERPAPI_NEWS_API_KEY) so Explore doesn't burn the main key's quota;
    // the old shared key stays as fallback.
    const serpApiKey = Deno.env.get('SERPAPI_NEWS_API_KEY') || Deno.env.get('SERPAPI_API_KEY')
    if (!serpApiKey) {
      console.error('❌ [GOOGLE NEWS] No SerpAPI key is set')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'News service is not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request - support both GET (no body) and POST (with body)
    let query = 'technology' // Default query
    if (req.method === 'POST') {
      try {
        const body = await req.json() as GoogleNewsRequest
        if (body.query) {
          query = body.query
        }
      } catch (_e) {
        // If JSON parsing fails, use default
        console.log('⚠️ [GOOGLE NEWS] Could not parse request body, using default query')
      }
    }

    console.log(`📰 [GOOGLE NEWS] Fetching news for query: ${query}`)

    // Build SERP API URL
    const serpApiUrl = new URL('https://serpapi.com/search')
    serpApiUrl.searchParams.append('engine', 'google_news')
    serpApiUrl.searchParams.append('q', query)
    serpApiUrl.searchParams.append('api_key', serpApiKey)

    console.log('📰 [GOOGLE NEWS] SERP API URL:', serpApiUrl.toString().replace(serpApiKey, 'REDACTED'))

    // Call SERP API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    const response = await fetch(serpApiUrl.toString(), {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`❌ [GOOGLE NEWS] SERP API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`❌ [GOOGLE NEWS] Error body:`, errorText)

      // Users never see provider/quota details — those live in the function logs.
      return new Response(
        JSON.stringify({
          success: false,
          error: 'The news service is not available right now — please try again later.'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json() as SerpApiResponse
    console.log(`✅ [GOOGLE NEWS] Response received`)
    console.log(`✅ [GOOGLE NEWS] News results: ${data.news_results?.length || 0}`)

    // Transform results
    const articles: NewsArticle[] = (data.news_results || []).map(item => ({
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      date: item.date || '',
      source: item.source?.name || 'Unknown',
      thumbnail: item.thumbnail || item.image_url,
    }))

    console.log(`✅ [GOOGLE NEWS] Returning ${articles.length} articles`)

    const result = {
      success: true,
      data: {
        articles,
        query,
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ [GOOGLE NEWS] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
