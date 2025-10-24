// Supabase Edge Function for Bing Reverse Image Search via SERP API
// Uses bing_reverse_image engine - provides higher quality images than Google
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore: Deno is available in Supabase Edge Functions runtime
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface BingReverseImageSearchRequest {
  imageUrl: string
  query?: string // Optional text query to combine with image search
}

interface BingRelatedContent {
  position?: number
  title?: string
  link?: string
  thumbnail?: string
  date?: string
  source?: string
  original?: string // High-resolution original image URL
  cdn_original?: string // CDN-served original image
  domain?: string
  width?: number
  height?: number
  format?: string
  thumbnail_width?: number
  thumbnail_height?: number
  file_size?: string
}

interface BingImageInfo {
  title?: string
  link?: string
  thumbnail?: string
  date?: string
  source?: string
  original?: string
  cdn_original?: string
  domain?: string
  width?: number
  height?: number
  format?: string
  thumbnail_width?: number
  thumbnail_height?: number
  file_size?: string
}

interface BingSerpApiResponse {
  related_content?: BingRelatedContent[]
  image_info?: BingImageInfo
  search_information?: {
    total_estimated_matches?: number
  }
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔍 [BING REVERSE IMAGE SEARCH] Edge Function called')

    // Get SERP API key from environment (same key used for Google)
    const serpApiKey = Deno.env.get('SERPAPI_API_KEY')
    if (!serpApiKey) {
      console.error('❌ [BING REVERSE IMAGE SEARCH] SERPAPI_API_KEY is not set')
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
    const { imageUrl, query } = await req.json() as BingReverseImageSearchRequest

    if (!imageUrl) {
      console.error('❌ [BING REVERSE IMAGE SEARCH] No imageUrl provided')
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

    console.log(`🔍 [BING REVERSE IMAGE SEARCH] Searching for image: ${imageUrl.substring(0, 100)}...`)
    if (query) {
      console.log(`🔍 [BING REVERSE IMAGE SEARCH] With query: ${query}`)
    }

    // Build SERP API URL for Bing Reverse Image
    const serpApiUrl = new URL('https://serpapi.com/search.json')
    serpApiUrl.searchParams.append('engine', 'bing_reverse_image')
    serpApiUrl.searchParams.append('image_url', imageUrl)
    serpApiUrl.searchParams.append('api_key', serpApiKey)
    if (query) {
      // Bing supports text queries with reverse image search
      serpApiUrl.searchParams.append('q', query)
    }

    console.log('🔍 [BING REVERSE IMAGE SEARCH] SERP API URL:', serpApiUrl.toString().replace(serpApiKey, 'REDACTED'))

    // Call SERP API (server-side, no CORS issues)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    const response = await fetch(serpApiUrl.toString(), {
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`❌ [BING REVERSE IMAGE SEARCH] SERP API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`❌ [BING REVERSE IMAGE SEARCH] Error body:`, errorText)
      
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

    const data = await response.json() as BingSerpApiResponse
    console.log(`✅ [BING REVERSE IMAGE SEARCH] Response received`)
    console.log(`✅ [BING REVERSE IMAGE SEARCH] Related content count: ${data.related_content?.length || 0}`)
    console.log(`✅ [BING REVERSE IMAGE SEARCH] Total estimated matches: ${data.search_information?.total_estimated_matches || 0}`)

    // Transform Bing results to our format
    const MAX_IMAGES = 10

    // Extract web results from related_content
    const webResults = (data.related_content || [])
      .slice(0, MAX_IMAGES) // Cap at 10 results
      .map((item, index) => ({
        title: item.title || 'Untitled',
        url: item.link || '',
        content: `Source: ${item.source || 'Unknown'}\nDomain: ${item.domain || 'Unknown'}\nImage: ${item.width}x${item.height} ${item.format || 'unknown'}\nSize: ${item.file_size || 'unknown'}`,
        engine: 'bing' as const,
      }))

    // Extract images from related_content - use high-res original or cdn_original
    const imageResults = (data.related_content || [])
      .slice(0, MAX_IMAGES) // Cap at 10 images
      .filter(item => item.original || item.cdn_original || item.thumbnail)
      .map((item, index) => ({
        // Prefer original > cdn_original > thumbnail for best quality
        url: item.original || item.cdn_original || item.thumbnail || '',
        alt: item.title || 'Bing reverse image search result',
        source_url: item.source || item.link || '',
        title: item.title || '',
        width: item.width,
        height: item.height,
        format: item.format,
        file_size: item.file_size,
      }))

    // Also include the main image_info if available
    if (data.image_info && imageResults.length < MAX_IMAGES) {
      const mainImage = {
        url: data.image_info.original || data.image_info.cdn_original || data.image_info.thumbnail || '',
        alt: data.image_info.title || 'Main result',
        source_url: data.image_info.source || data.image_info.link || '',
        title: data.image_info.title || '',
        width: data.image_info.width,
        height: data.image_info.height,
        format: data.image_info.format,
        file_size: data.image_info.file_size,
      }
      imageResults.unshift(mainImage)
    }

    const result = {
      success: true,
      data: {
        web: webResults,
        images: imageResults.slice(0, MAX_IMAGES), // Final cap
        relatedSearches: [], // Bing doesn't provide related searches in the same way
        totalMatches: data.search_information?.total_estimated_matches || 0,
      }
    }

    console.log(`✅ [BING REVERSE IMAGE SEARCH] Final: ${webResults.length} web results, ${imageResults.length} images`)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [BING REVERSE IMAGE SEARCH] Error:', error)
    
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
