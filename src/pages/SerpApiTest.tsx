import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { googleReverseImageSearchTool } from '../commonService/searchTools/googleReverseImageSearchTool'
import { braveSearchTool } from '../commonService/searchTools/braveSearchTool'

export default function SerpApiTest() {
  // Left column: Reverse Image Search
  const [reverseLoading, setReverseLoading] = useState(false)
  const [reverseRawResults, setReverseRawResults] = useState<any>(null)
  const [reverseWriterPayload, setReverseWriterPayload] = useState<any>(null)
  
  // Right column: Brave Search
  const [braveLoading, setBraveLoading] = useState(false)
  const [braveRawResults, setBraveRawResults] = useState<any>(null)
  const [braveWriterPayload, setBraveWriterPayload] = useState<any>(null)

  // New: Enriched search (Image context + User query → Brave)
  const [enrichedLoading, setEnrichedLoading] = useState(false)
  const [enrichedQuery, setEnrichedQuery] = useState<string>('')
  const [enrichedRawResults, setEnrichedRawResults] = useState<any>(null)
  const [enrichedWriterPayload, setEnrichedWriterPayload] = useState<any>(null)

  // Test Reverse Image Search (Left Column)
  async function testReverseImageSearch() {
    setReverseLoading(true)
    setReverseRawResults(null)
    setReverseWriterPayload(null)

    try {
      console.log('🔍 [TEST] Starting Reverse Image Search test')
      
      // Step 1: Upload iPhone 17 image to Supabase Storage
      const response = await fetch('/iphone17.jpg')
      const blob = await response.blob()
      
      console.log(`📤 [TEST] Uploading image: ${blob.size} bytes`)
      
      const timestamp = Date.now()
      const fileName = `test-${timestamp}.png`
      const filePath = `uploads/${fileName}`
      
      const { data, error } = await supabase.storage
        .from('reverse-image-searches')
        .upload(filePath, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('❌ [TEST] Upload error:', error.message)
        alert(`Upload error: ${error.message}`)
        setReverseLoading(false)
        return
      }
      
      console.log(`✅ [TEST] Upload successful: ${data.path}`)
      
      // Step 2: Get public URL
      const { data: urlData } = supabase.storage
        .from('reverse-image-searches')
        .getPublicUrl(filePath)
      
      const imageUrl = urlData.publicUrl
      console.log(`✅ [TEST] Public URL: ${imageUrl}`)
      
      // Step 3: Call googleReverseImageSearchTool (Google SERP API engine)
      console.log('🔍 [TEST] Calling googleReverseImageSearchTool...')
      const toolResults = await googleReverseImageSearchTool(imageUrl)
      
      console.log('✅ [TEST] Reverse Image Search completed:', {
        webCount: toolResults.web.length,
        imagesCount: toolResults.images.length,
        relatedSearchesCount: toolResults.relatedSearches.length
      })
      
      // Save raw results
      setReverseRawResults(toolResults)
      
      // Step 4: Format payload for Writer Agent (mimicking what RetrieverAgent does)
      const writerPayload = {
        query: '', // Empty query for image-only search (no text query provided)
        results: toolResults.web.slice(0, 10), // Limit to 10 like production
        images: toolResults.images.slice(0, 50), // Limit to 50 like production
        videos: []
      }
      
      console.log('📦 [TEST] Writer Agent Payload prepared:', {
        resultsCount: writerPayload.results.length,
        imagesCount: writerPayload.images.length
      })
      
      setReverseWriterPayload(writerPayload)
      
    } catch (error: any) {
      console.error('❌ [TEST] Reverse Image Search error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setReverseLoading(false)
    }
  }

  /**
   * Build enriched context from Google reverse image search results
   * Extracts keywords, website names, and image titles from first 4 results
   * Max 400 characters, 50 words
   */
  function buildEnrichedContext(googleResults: any): string {
    if (!googleResults || (!googleResults.web && !googleResults.images)) {
      return ''
    }

    const keywords: string[] = []
    const websites: Set<string> = new Set()
    const imageTitles: string[] = []

    // Extract from web results (first 4)
    const webResults = googleResults.web?.slice(0, 4) || []
    webResults.forEach((result: any) => {
      // Extract domain name (remove www, .com, etc)
      try {
        const domain = new URL(result.url).hostname
          .replace('www.', '')
          .split('.')[0]
        if (domain) websites.add(domain)
      } catch {}

      // Extract key words from title (skip common words)
      const title = result.title || ''
      const titleWords = title.split(/\s+/)
        .filter((w: string) => w.length > 3 && !/^(the|and|for|with|from|this|that)$/i.test(w))
        .slice(0, 3)
      keywords.push(...titleWords)
    })

    // Extract from image results (first 4)
    const imageResults = googleResults.images?.slice(0, 4) || []
    imageResults.forEach((img: any) => {
      const title = img.title || img.alt || ''
      // Truncate long image titles
      const shortTitle = title.length > 30 ? title.slice(0, 27) + '...' : title
      if (shortTitle) imageTitles.push(shortTitle)
    })

    // Build context string
    const uniqueKeywords = [...new Set(keywords)].slice(0, 10) // Top 10 keywords
    const topWebsites = Array.from(websites).slice(0, 4) // Top 4 websites
    
    let context = ''
    if (uniqueKeywords.length > 0) {
      context += uniqueKeywords.join(' ')
    }
    if (topWebsites.length > 0) {
      context += (context ? '. ' : '') + 'From: ' + topWebsites.join(', ')
    }
    if (imageTitles.length > 0) {
      context += (context ? '. ' : '') + 'Images: ' + imageTitles.slice(0, 2).join('; ')
    }

    // Enforce caps: 400 chars, 50 words
    const words = context.split(/\s+/)
    if (words.length > 50) {
      context = words.slice(0, 50).join(' ') + '...'
    }
    if (context.length > 400) {
      context = context.slice(0, 397) + '...'
    }

    return context
  }

  // Test Enriched Search (Image Context + User Query → Brave)
  async function testEnrichedSearch() {
    setEnrichedLoading(true)
    setEnrichedRawResults(null)
    setEnrichedWriterPayload(null)
    setEnrichedQuery('')

    try {
      console.log('🔍 [TEST] Starting Enriched Search test')
      
      // Step 1: Check if we have reverse image results
      if (!reverseRawResults) {
        alert('Please run "Test Reverse Image" first to get context!')
        setEnrichedLoading(false)
        return
      }

      // Step 2: Build context from first 4 Google results
      const context = buildEnrichedContext(reverseRawResults)
      console.log('📦 [TEST] Built context from Google results:', context)

      // Step 3: User query (simulated - in real app this would be user input)
      const userQuery = 'alternativas más baratas con buena cámara'
      
      // Step 4: Build enriched query
      const enrichedQueryText = context 
        ? `${userQuery}. Relacionado con: ${context}`
        : userQuery

      setEnrichedQuery(enrichedQueryText)
      
      console.log('🔍 [TEST] Enriched query:', enrichedQueryText)
      console.log('🔍 [TEST] Query length:', {
        chars: enrichedQueryText.length,
        words: enrichedQueryText.split(/\s+/).length
      })

      // Step 5: Call Brave with enriched query
      console.log('🔍 [TEST] Calling braveSearchTool with enriched query...')
      const toolResults = await braveSearchTool(enrichedQueryText)
      
      console.log('✅ [TEST] Enriched Brave Search completed:', {
        webCount: toolResults.web.length,
        imagesCount: toolResults.images.length,
        newsCount: toolResults.news.length,
        videosCount: toolResults.videos.length
      })
      
      // Save raw results
      setEnrichedRawResults(toolResults)
      
      // Step 6: Format payload for Writer Agent
      const writerPayload = {
        query: userQuery, // Original user query (not enriched)
        results: [...toolResults.web, ...toolResults.news].slice(0, 10),
        images: toolResults.images.slice(0, 50),
        videos: toolResults.videos.slice(0, 10),
        isReverseImageSearch: false // This is text search with image context
      }
      
      console.log('📦 [TEST] Writer Agent Payload prepared:', {
        originalQuery: userQuery,
        enrichedQuery: enrichedQueryText,
        resultsCount: writerPayload.results.length,
        imagesCount: writerPayload.images.length,
        videosCount: writerPayload.videos.length
      })
      
      setEnrichedWriterPayload(writerPayload)
      
    } catch (error: any) {
      console.error('❌ [TEST] Enriched Search error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setEnrichedLoading(false)
    }
  }

  // Test Brave Search (Right Column)
  async function testBraveSearch() {
    setBraveLoading(true)
    setBraveRawResults(null)
    setBraveWriterPayload(null)

    try {
      console.log('🔍 [TEST] Starting Brave Search test')
      
      // Call braveSearchTool with hardcoded "Elon Musk" query (same as production)
      const query = 'Elon Musk'
      console.log(`🔍 [TEST] Calling braveSearchTool with: "${query}"`)
      const toolResults = await braveSearchTool(query)
      
      console.log('✅ [TEST] Brave Search completed:', {
        webCount: toolResults.web.length,
        imagesCount: toolResults.images.length,
        newsCount: toolResults.news.length,
        videosCount: toolResults.videos.length
      })
      
      // Save raw results
      setBraveRawResults(toolResults)
      
      // Format payload for Writer Agent (mimicking what RetrieverAgent does)
      const writerPayload = {
        query: query,
        results: [...toolResults.web, ...toolResults.news].slice(0, 10), // Combine web+news, limit to 10
        images: toolResults.images.slice(0, 50), // Limit to 50
        videos: toolResults.videos.slice(0, 10) // Limit to 10
      }
      
      console.log('📦 [TEST] Writer Agent Payload prepared:', {
        resultsCount: writerPayload.results.length,
        imagesCount: writerPayload.images.length,
        videosCount: writerPayload.videos.length
      })
      
      setBraveWriterPayload(writerPayload)
      
    } catch (error: any) {
      console.error('❌ [TEST] Brave Search error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setBraveLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1800px', margin: '0 auto', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#333' }}>🧪 Side-by-Side Search Comparison</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Compare Reverse Image Search (SERP API) vs Brave Text Search - Both showing raw results and formatted Writer Agent payload
      </p>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        {/* Left Column: Reverse Image Search */}
        <div style={{ flex: 1, border: '2px solid #007bff', borderRadius: '8px', padding: '15px', background: 'white' }}>
          <h2 style={{ marginTop: 0, color: '#007bff' }}>📸 Reverse Image Search</h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Uploads <strong>iphone17.jpg</strong> → Supabase Storage → SERP API
          </p>
          <img 
            src="/iphone17.jpg" 
            alt="iPhone 17" 
            style={{ width: '150px', border: '2px solid #ddd', borderRadius: '8px', marginBottom: '15px' }}
          />
          <button 
            onClick={testReverseImageSearch}
            disabled={reverseLoading}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '16px',
              background: reverseLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: reverseLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginBottom: '15px'
            }}
          >
            {reverseLoading ? '⏳ Testing...' : '🔍 Test Reverse Image'}
          </button>

          {/* NEW: Enriched Search Button */}
          <button 
            onClick={testEnrichedSearch}
            disabled={enrichedLoading || !reverseRawResults}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '16px',
              background: enrichedLoading ? '#ccc' : !reverseRawResults ? '#999' : '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: enrichedLoading || !reverseRawResults ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginBottom: '15px'
            }}
            title={!reverseRawResults ? 'Run "Test Reverse Image" first' : 'Test enriched search with image context'}
          >
            {enrichedLoading ? '⏳ Testing...' : '🚀 Test Enriched Search (Image + Query)'}
          </button>

          {/* Display enriched query if available */}
          {enrichedQuery && (
            <div style={{ 
              background: '#fff3e0', 
              padding: '12px', 
              borderRadius: '6px',
              border: '1px solid #ff6b35',
              marginBottom: '15px'
            }}>
              <h4 style={{ marginTop: 0, color: '#ff6b35', fontSize: '13px' }}>
                📝 Enriched Query Sent to Brave:
              </h4>
              <div style={{ 
                fontSize: '12px', 
                color: '#333',
                fontFamily: 'monospace',
                wordBreak: 'break-word'
              }}>
                {enrichedQuery}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: '#666',
                marginTop: '8px'
              }}>
                Length: {enrichedQuery.length} chars, {enrichedQuery.split(/\s+/).length} words
              </div>
            </div>
          )}

          {/* Display first 4 images from reverse image search */}
          {reverseRawResults?.images && reverseRawResults.images.length > 0 && (
            <div style={{ 
              background: '#e7f3ff', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid #007bff'
            }}>
              <h4 style={{ marginTop: 0, color: '#007bff', fontSize: '14px' }}>
                🖼️ First 4 Images from Results (Total: {reverseRawResults.images.length})
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '10px' 
              }}>
                {reverseRawResults.images.slice(0, 4).map((img: any, idx: number) => (
                  <div key={idx} style={{ 
                    background: 'white', 
                    padding: '8px', 
                    borderRadius: '6px',
                    border: '1px solid #ccc'
                  }}>
                    <img 
                      src={img.url} 
                      alt={img.alt || `Result ${idx + 1}`}
                      style={{ 
                        width: '100%', 
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginBottom: '5px'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const errorDiv = e.currentTarget.nextElementSibling as HTMLElement
                        if (errorDiv) errorDiv.style.display = 'block'
                      }}
                    />
                    <div style={{ 
                      display: 'none', 
                      padding: '10px', 
                      background: '#f8d7da', 
                      color: '#721c24',
                      borderRadius: '4px',
                      fontSize: '11px',
                      textAlign: 'center'
                    }}>
                      ❌ Failed to load
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: '3px'
                    }} title={img.alt || 'No title'}>
                      {img.alt || `Image ${idx + 1}`}
                    </div>
                    <div style={{ 
                      fontSize: '9px', 
                      color: '#999',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>
                      📐 {img.resolution || 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Brave Search */}
        <div style={{ flex: 1, border: '2px solid #28a745', borderRadius: '8px', padding: '15px', background: 'white' }}>
          <h2 style={{ marginTop: 0, color: '#28a745' }}>🦁 Brave Text Search</h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Hardcoded query: <strong>"Elon Musk"</strong> → Brave API
          </p>
          <div style={{ 
            height: '150px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: '#f0f0f0',
            borderRadius: '8px',
            marginBottom: '15px',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#666'
          }}>
            "Elon Musk"
          </div>
          <button 
            onClick={testBraveSearch}
            disabled={braveLoading}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '16px',
              background: braveLoading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: braveLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginBottom: '15px'
            }}
          >
            {braveLoading ? '⏳ Testing...' : '🔍 Test Brave Search'}
          </button>

          {/* Display first 4 images from Brave search */}
          {braveRawResults?.images && braveRawResults.images.length > 0 && (
            <div style={{ 
              background: '#d4edda', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid #28a745'
            }}>
              <h4 style={{ marginTop: 0, color: '#28a745', fontSize: '14px' }}>
                🖼️ First 4 Images from Results (Total: {braveRawResults.images.length})
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '10px' 
              }}>
                {braveRawResults.images.slice(0, 4).map((img: any, idx: number) => (
                  <div key={idx} style={{ 
                    background: 'white', 
                    padding: '8px', 
                    borderRadius: '6px',
                    border: '1px solid #ccc'
                  }}>
                    <img 
                      src={img.url} 
                      alt={img.alt || `Result ${idx + 1}`}
                      style={{ 
                        width: '100%', 
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginBottom: '5px'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const errorDiv = e.currentTarget.nextElementSibling as HTMLElement
                        if (errorDiv) errorDiv.style.display = 'block'
                      }}
                    />
                    <div style={{ 
                      display: 'none', 
                      padding: '10px', 
                      background: '#f8d7da', 
                      color: '#721c24',
                      borderRadius: '4px',
                      fontSize: '11px',
                      textAlign: 'center'
                    }}>
                      ❌ Failed to load
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={img.alt || 'No title'}>
                      {img.alt || `Image ${idx + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Results */}
        <div>
          {/* Raw Results - Reverse Image */}
          {reverseRawResults && (
            <div style={{ marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3 style={{ color: '#007bff', marginTop: 0 }}>📦 Raw Tool Results (googleReverseImageSearchTool)</h3>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Summary:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#333' }}>
                  <li>Web results: {reverseRawResults.web?.length || 0}</li>
                  <li>Images: {reverseRawResults.images?.length || 0}</li>
                  <li>Related searches: {reverseRawResults.relatedSearches?.length || 0}</li>
                </ul>
              </div>
              <details>
                <summary style={{ cursor: 'pointer', padding: '10px', background: '#e7f3ff', borderRadius: '4px', marginBottom: '5px', color: '#004085', fontWeight: '500' }}>
                  Click to expand full JSON
                </summary>
                <pre style={{ 
                  background: '#1e1e1e', 
                  color: '#d4d4d4', 
                  padding: '15px', 
                  borderRadius: '6px',
                  fontSize: '11px',
                  overflowX: 'auto',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {JSON.stringify(reverseRawResults, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Writer Payload - Reverse Image */}
          {reverseWriterPayload && (
            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3 style={{ color: '#007bff', marginTop: 0 }}>✍️ Writer Agent Payload (What RetrieverAgent sends)</h3>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Summary:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#333' }}>
                  <li>Query: "{reverseWriterPayload.query}"</li>
                  <li>Results: {reverseWriterPayload.results?.length || 0}</li>
                  <li>Images: {reverseWriterPayload.images?.length || 0}</li>
                  <li>Videos: {reverseWriterPayload.videos?.length || 0}</li>
                </ul>
              </div>
              <details>
                <summary style={{ cursor: 'pointer', padding: '10px', background: '#e7f3ff', borderRadius: '4px', marginBottom: '5px', color: '#004085', fontWeight: '500' }}>
                  Click to expand full JSON
                </summary>
                <pre style={{ 
                  background: '#1e1e1e', 
                  color: '#d4d4d4', 
                  padding: '15px', 
                  borderRadius: '6px',
                  fontSize: '11px',
                  overflowX: 'auto',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {JSON.stringify(reverseWriterPayload, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Right Results */}
        <div>
          {/* Raw Results - Brave */}
          {braveRawResults && (
            <div style={{ marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3 style={{ color: '#28a745', marginTop: 0 }}>📦 Raw Tool Results (braveSearchTool)</h3>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Summary:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#333' }}>
                  <li>Web results: {braveRawResults.web?.length || 0}</li>
                  <li>Images: {braveRawResults.images?.length || 0}</li>
                  <li>News: {braveRawResults.news?.length || 0}</li>
                  <li>Videos: {braveRawResults.videos?.length || 0}</li>
                </ul>
              </div>
              <details>
                <summary style={{ cursor: 'pointer', padding: '10px', background: '#d4edda', borderRadius: '4px', marginBottom: '5px', color: '#155724', fontWeight: '500' }}>
                  Click to expand full JSON
                </summary>
                <pre style={{ 
                  background: '#1e1e1e', 
                  color: '#d4d4d4', 
                  padding: '15px', 
                  borderRadius: '6px',
                  fontSize: '11px',
                  overflowX: 'auto',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {JSON.stringify(braveRawResults, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Writer Payload - Brave */}
          {braveWriterPayload && (
            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3 style={{ color: '#28a745', marginTop: 0 }}>✍️ Writer Agent Payload (What RetrieverAgent sends)</h3>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Summary:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#333' }}>
                  <li>Query: "{braveWriterPayload.query}"</li>
                  <li>Results: {braveWriterPayload.results?.length || 0}</li>
                  <li>Images: {braveWriterPayload.images?.length || 0}</li>
                  <li>Videos: {braveWriterPayload.videos?.length || 0}</li>
                </ul>
              </div>
              <details>
                <summary style={{ cursor: 'pointer', padding: '10px', background: '#d4edda', borderRadius: '4px', marginBottom: '5px', color: '#155724', fontWeight: '500' }}>
                  Click to expand full JSON
                </summary>
                <pre style={{ 
                  background: '#1e1e1e', 
                  color: '#d4d4d4', 
                  padding: '15px', 
                  borderRadius: '6px',
                  fontSize: '11px',
                  overflowX: 'auto',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {JSON.stringify(braveWriterPayload, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* NEW: Enriched Search Results Section */}
      {enrichedRawResults && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ color: '#ff6b35' }}>🚀 Enriched Search Results (Image Context + Query → Brave)</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Left: Raw Results */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ff6b35' }}>
              <h3 style={{ color: '#ff6b35', marginTop: 0 }}>📦 Raw Tool Results (braveSearchTool)</h3>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Summary:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#333' }}>
                  <li>Web Results: {enrichedRawResults.web?.length || 0}</li>
                  <li>Images: {enrichedRawResults.images?.length || 0}</li>
                  <li>News: {enrichedRawResults.news?.length || 0}</li>
                  <li>Videos: {enrichedRawResults.videos?.length || 0}</li>
                </ul>
              </div>
              
              {/* Display first 4 images */}
              {enrichedRawResults.images && enrichedRawResults.images.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                  <h4 style={{ color: '#ff6b35', fontSize: '14px' }}>🖼️ First 4 Images:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {enrichedRawResults.images.slice(0, 4).map((img: any, idx: number) => (
                      <div key={idx} style={{ background: '#fff', padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <img 
                          src={img.url} 
                          alt={img.alt || `Result ${idx + 1}`}
                          style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '3px' }}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                        <div style={{ fontSize: '9px', color: '#666', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {img.alt || 'No title'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <details style={{ marginTop: '15px' }}>
                <summary style={{ cursor: 'pointer', padding: '10px', background: '#fff3e0', borderRadius: '4px', color: '#e65100', fontWeight: '500' }}>
                  Click to expand full JSON
                </summary>
                <pre style={{ 
                  background: '#1e1e1e', 
                  color: '#d4d4d4', 
                  padding: '15px', 
                  borderRadius: '6px',
                  fontSize: '11px',
                  overflowX: 'auto',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {JSON.stringify(enrichedRawResults, null, 2)}
                </pre>
              </details>
            </div>

            {/* Right: Writer Payload */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ff6b35' }}>
              <h3 style={{ color: '#ff6b35', marginTop: 0 }}>✍️ Writer Agent Payload</h3>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Summary:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#333' }}>
                  <li>Query: "{enrichedWriterPayload?.query || ''}"</li>
                  <li>Results: {enrichedWriterPayload?.results?.length || 0}</li>
                  <li>Images: {enrichedWriterPayload?.images?.length || 0}</li>
                  <li>Videos: {enrichedWriterPayload?.videos?.length || 0}</li>
                  <li>isReverseImageSearch: {enrichedWriterPayload?.isReverseImageSearch ? 'true' : 'false'}</li>
                </ul>
              </div>
              <div style={{ background: '#fff3e0', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                <strong style={{ color: '#e65100' }}>Enriched Query Used:</strong>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#333', marginTop: '5px', wordBreak: 'break-word' }}>
                  {enrichedQuery}
                </div>
              </div>
              <details>
                <summary style={{ cursor: 'pointer', padding: '10px', background: '#fff3e0', borderRadius: '4px', color: '#e65100', fontWeight: '500' }}>
                  Click to expand full JSON
                </summary>
                <pre style={{ 
                  background: '#1e1e1e', 
                  color: '#d4d4d4', 
                  padding: '15px', 
                  borderRadius: '6px',
                  fontSize: '11px',
                  overflowX: 'auto',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {JSON.stringify(enrichedWriterPayload, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{ marginTop: '30px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <h3 style={{ marginTop: 0, color: '#856404' }}>📋 How to Use This Test</h3>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
          <li><strong>Click "Test Reverse Image"</strong> - Uploads iphone17.jpg and calls SERP API</li>
          <li><strong>Click "Test Brave Search"</strong> - Searches "Elon Musk" using Brave</li>
          <li><strong>Click "Test Enriched Search"</strong> - 🆕 Extracts context from Google results + adds user query → Brave</li>
          <li><strong>Compare Raw Results</strong> - See what each tool returns (first row)</li>
          <li><strong>Compare Writer Payloads</strong> - See what RetrieverAgent formats for Writer (second row)</li>
          <li><strong>Check Images Structure</strong> - Expand JSONs and verify image fields (url, alt, source_url)</li>
        </ol>
        <p style={{ marginBottom: 0, marginTop: '10px', fontSize: '14px', color: '#856404' }}>
          <strong>Note:</strong> This uses the EXACT same tools and logic as production - no mocking!
        </p>
        <div style={{ marginTop: '10px', padding: '10px', background: '#fff', borderRadius: '6px' }}>
          <strong style={{ color: '#ff6b35' }}>🆕 Enriched Search Flow:</strong>
          <ol style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '13px', color: '#333' }}>
            <li>Google reverse image search identifies the image (e.g., "iPhone 17 Pro Max Apple smartphone")</li>
            <li>Extracts context: keywords, website names, image titles</li>
            <li>User adds query: "alternativas más baratas con buena cámara"</li>
            <li>Combines: "alternativas más baratas con buena cámara. Relacionado con: [context]"</li>
            <li>Brave search returns relevant results (e.g., Samsung, Pixel comparisons)</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

