// Supabase Edge Function for SERP API Reverse Image Search
// This function handles SERP API calls server-side to avoid CORS issues
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore: Deno is available in Supabase Edge Functions runtime
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ReverseImageSearchRequest {
  imageUrl: string
  query?: string // Optional text query to combine with image search
}

interface SerpApiWebResult {
  title?: string
  link?: string
  snippet?: string
  source?: string
  thumbnail?: string  // Low-res SerpAPI cached thumbnail
  original?: string   // High-res original image URL
  image_resolution?: string
  position?: number
  displayed_link?: string
  cached_page_link?: string
}

interface SerpApiResponse {
  image_results?: SerpApiWebResult[]
  related_searches?: Array<{ query: string }>
  search_information?: {
    status?: string
    organic_results_state?: string
  }
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔍 [REVERSE IMAGE SEARCH] Edge Function called')

    // Get SERP API key from environment
    const serpApiKey = Deno.env.get('SERPAPI_API_KEY')
    if (!serpApiKey) {
      console.error('❌ [REVERSE IMAGE SEARCH] SERPAPI_API_KEY is not set')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SERPAPI_API_KEY is not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { imageUrl, query } = await req.json() as ReverseImageSearchRequest

    if (!imageUrl) {
      console.error('❌ [REVERSE IMAGE SEARCH] No imageUrl provided')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'imageUrl is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔍 [REVERSE IMAGE SEARCH] Searching for image: ${imageUrl.substring(0, 100)}...`)
    if (query) {
      console.log(`🔍 [REVERSE IMAGE SEARCH] With query: ${query}`)
    }

    // Pagination configuration
    const MAX_PAGES = 5
    const TARGET_IMAGES = 10
    const allWebResults: Array<{title: string, url: string, content: string, engine: 'serp'}> = []
    const allImageResults: Array<{url: string, alt: string, source_url: string, title: string}> = []
    let allRelatedSearches: string[] = []
    let currentPage = 0
    let start = 0

    // Pagination loop
    while (currentPage < MAX_PAGES && allImageResults.length < TARGET_IMAGES) {
      currentPage++
      console.log(`🔍 [REVERSE IMAGE SEARCH] Fetching page ${currentPage} (start=${start})...`)

      // Build SERP API URL with pagination
      const serpApiUrl = new URL('https://serpapi.com/search.json')
      serpApiUrl.searchParams.append('engine', 'google_reverse_image')
      serpApiUrl.searchParams.append('image_url', imageUrl)
      serpApiUrl.searchParams.append('api_key', serpApiKey)
      if (query) {
        // Add text query if provided
        serpApiUrl.searchParams.append('q', query)
      }
      if (start > 0) {
        serpApiUrl.searchParams.append('start', start.toString())
      }

      console.log('🔍 [REVERSE IMAGE SEARCH] SERP API URL:', serpApiUrl.toString().replace(serpApiKey, 'REDACTED'))

      // Call SERP API (server-side, no CORS issues)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

      const response = await fetch(serpApiUrl.toString(), {
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`❌ [REVERSE IMAGE SEARCH] SERP API error on page ${currentPage}: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`❌ [REVERSE IMAGE SEARCH] Error body:`, errorText)
        
        // If first page fails, return error; otherwise break and return what we have
        if (currentPage === 1) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `SERP API error: ${response.status} ${response.statusText}`,
              details: errorText
            }),
            { 
              status: response.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        console.log(`⚠️ [REVERSE IMAGE SEARCH] Stopping pagination due to error on page ${currentPage}`)
        break
      }

      const data = await response.json() as SerpApiResponse
      console.log(`✅ [REVERSE IMAGE SEARCH] Page ${currentPage} response received`)
      console.log(`✅ [REVERSE IMAGE SEARCH] Page ${currentPage} image results: ${data.image_results?.length || 0}`)
      
      // Check if we've reached the end
      if (data.search_information?.organic_results_state === 'Fully empty') {
        console.log(`✅ [REVERSE IMAGE SEARCH] Reached end of results (organic_results_state: Fully empty)`)
        break
      }

      // Check if no results on this page
      if (!data.image_results || data.image_results.length === 0) {
        console.log(`✅ [REVERSE IMAGE SEARCH] No more results on page ${currentPage}`)
        break
      }

      // Log first few results for debugging (only on first page)
      if (currentPage === 1 && data.image_results && data.image_results.length > 0) {
        console.log(`✅ [REVERSE IMAGE SEARCH] First 3 results:`)
        data.image_results.slice(0, 3).forEach((result, i) => {
          console.log(`  ${i + 1}. Title: ${result.title}, Has thumbnail: ${!!result.thumbnail}`)
        })
      }

      // Accumulate web results
      const pageWebResults = (data.image_results || []).map(result => ({
        title: result.title || 'Untitled',
        url: result.link || '',
        content: result.snippet || '',
        engine: 'serp' as const,
      }))
      allWebResults.push(...pageWebResults)

      // Accumulate image results - but cap to avoid exceeding TARGET_IMAGES
      const remainingSlots = TARGET_IMAGES - allImageResults.length
      const pageImageResults = (data.image_results || [])
        .filter(result => result.original || result.thumbnail) // Require at least one image URL
        .slice(0, remainingSlots) // Only take what we need to reach TARGET_IMAGES
        .map(result => ({
          url: result.original || result.thumbnail || '', // Prefer original (high-res) over thumbnail
          alt: result.title || 'Reverse image search result',
          source_url: result.link || '',
          title: result.title || '',
          resolution: result.image_resolution || 'Unknown', // Original image resolution (e.g., "1920 × 1080")
        }))
      allImageResults.push(...pageImageResults)

      // Accumulate related searches (only from first page typically)
      if (data.related_searches && data.related_searches.length > 0) {
        const pageRelatedSearches = data.related_searches.map(search => search.query)
        allRelatedSearches = [...new Set([...allRelatedSearches, ...pageRelatedSearches])]
      }

      console.log(`✅ [REVERSE IMAGE SEARCH] Total so far: ${allImageResults.length} images from ${currentPage} page(s)`)

      // Check if we've reached target (should be exact now due to slicing)
      if (allImageResults.length >= TARGET_IMAGES) {
        console.log(`✅ [REVERSE IMAGE SEARCH] Reached target of ${TARGET_IMAGES} images`)
        break
      }

      // Increment start for next page
      start += 10
    }

    // Final safety cap - ensure we never exceed TARGET_IMAGES (10)
    const cappedImages = allImageResults.slice(0, TARGET_IMAGES)
    const cappedWebResults = allWebResults.slice(0, 10) // Cap web results at 10 too

    const result = {
      success: true,
      data: {
        web: cappedWebResults,
        images: cappedImages,
        relatedSearches: allRelatedSearches,
      }
    }

    console.log(`✅ [REVERSE IMAGE SEARCH] Final: ${cappedWebResults.length} web results, ${cappedImages.length} images from ${currentPage} page(s)`)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [REVERSE IMAGE SEARCH] Error:', error)
    
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
