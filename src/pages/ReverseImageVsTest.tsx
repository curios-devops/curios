import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { googleReverseImageSearchTool } from '../commonService/searchTools/googleReverseImageSearchTool';
import { bingReverseImageSearchTool } from '../commonService/searchTools/bingReverseImageSearchTool';

export default function ReverseImageVsTest() {
  const [googleRawResults, setGoogleRawResults] = useState<any>(null);
  const [googleWriterPayload, setGoogleWriterPayload] = useState<any>(null);
  const [bingRawResults, setBingRawResults] = useState<any>(null);
  const [bingWriterPayload, setBingWriterPayload] = useState<any>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [bingLoading, setBingLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [bingError, setBingError] = useState<string | null>(null);

  // Hardcoded test image
  const imageUrl = `${window.location.origin}/Elon Musk.png`;

  // Test Google Reverse Image Search (same logic as original)
  async function handleGoogleSearch() {
    setGoogleLoading(true);
    setGoogleError(null);
    setGoogleRawResults(null);
    setGoogleWriterPayload(null);

    try {
      console.log('🔍 [TEST] Starting Google Reverse Image Search test');
      
      // Step 1: Upload Elon Musk image to Supabase Storage
      const response = await fetch('/Elon Musk.png');
      const blob = await response.blob();
      
      console.log(`📤 [TEST] Uploading image: ${blob.size} bytes`);
      
      const timestamp = Date.now();
      const fileName = `test-google-${timestamp}.png`;
      const filePath = `uploads/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('reverse-image-searches')
        .upload(filePath, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('❌ [TEST] Upload error:', error.message);
        setGoogleError(`Upload error: ${error.message}`);
        setGoogleLoading(false);
        return;
      }
      
      console.log(`✅ [TEST] Upload successful: ${data.path}`);
      
      // Step 2: Get public URL
      const { data: urlData } = supabase.storage
        .from('reverse-image-searches')
        .getPublicUrl(filePath);
      
      const imageUrl = urlData.publicUrl;
      console.log(`✅ [TEST] Public URL: ${imageUrl}`);
      
      // Step 3: Call googleReverseImageSearchTool (Google SERP API engine)
      console.log('🔍 [TEST] Calling googleReverseImageSearchTool...');
      const toolResults = await googleReverseImageSearchTool(imageUrl);
      
      console.log('✅ [TEST] Google Reverse Image Search completed:', {
        webCount: toolResults.web.length,
        imagesCount: toolResults.images.length,
        relatedSearchesCount: toolResults.relatedSearches.length
      });
      
      // Save raw results
      setGoogleRawResults(toolResults);
      
      // Step 4: Format payload for Writer Agent (mimicking what RetrieverAgent does)
      const writerPayload = {
        query: '', // Empty query for image-only search (no text query provided)
        results: toolResults.web.slice(0, 10), // Limit to 10 like production
        images: toolResults.images.slice(0, 50), // Limit to 50 like production
        videos: []
      };
      
      console.log('📦 [TEST] Writer Agent Payload prepared:', {
        resultsCount: writerPayload.results.length,
        imagesCount: writerPayload.images.length
      });
      
      setGoogleWriterPayload(writerPayload);
      
    } catch (error: any) {
      console.error('❌ [TEST] Google Reverse Image Search error:', error);
      setGoogleError(error.message);
    } finally {
      setGoogleLoading(false);
    }
  }

  // Test Bing Reverse Image Search (same logic as Google)
  async function handleBingSearch() {
    setBingLoading(true);
    setBingError(null);
    setBingRawResults(null);
    setBingWriterPayload(null);

    try {
      console.log('🔍 [TEST] Starting Bing Reverse Image Search test');
      
      // Step 1: Upload Elon Musk image to Supabase Storage
      const response = await fetch('/Elon Musk.png');
      const blob = await response.blob();
      
      console.log(`📤 [TEST] Uploading image: ${blob.size} bytes`);
      
      const timestamp = Date.now();
      const fileName = `test-bing-${timestamp}.png`;
      const filePath = `uploads/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('reverse-image-searches')
        .upload(filePath, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('❌ [TEST] Upload error:', error.message);
        setBingError(`Upload error: ${error.message}`);
        setBingLoading(false);
        return;
      }
      
      console.log(`✅ [TEST] Upload successful: ${data.path}`);
      
      // Step 2: Get public URL
      const { data: urlData } = supabase.storage
        .from('reverse-image-searches')
        .getPublicUrl(filePath);
      
      const imageUrl = urlData.publicUrl;
      console.log(`✅ [TEST] Public URL: ${imageUrl}`);
      
      // Step 3: Call bingReverseImageSearchTool (same pattern as Google)
      console.log('🔍 [TEST] Calling bingReverseImageSearchTool...');
      const toolResults = await bingReverseImageSearchTool(imageUrl);
      
      console.log('✅ [TEST] Bing Reverse Image Search completed:', {
        webCount: toolResults.web.length,
        imagesCount: toolResults.images.length,
        relatedSearchesCount: toolResults.relatedSearches?.length || 0,
        totalMatches: toolResults.totalMatches || 0
      });
      
      // Save raw results
      setBingRawResults(toolResults);
      
      // Step 4: Format payload for Writer Agent (same as Google)
      const writerPayload = {
        query: '', // Empty query for image-only search
        results: toolResults.web.slice(0, 10), // Limit to 10 like production
        images: toolResults.images.slice(0, 50), // Limit to 50 like production
        videos: []
      };
      
      console.log('📦 [TEST] Writer Agent Payload prepared:', {
        resultsCount: writerPayload.results.length,
        imagesCount: writerPayload.images.length
      });
      
      setBingWriterPayload(writerPayload);
      
    } catch (error: any) {
      console.error('❌ [TEST] Bing Reverse Image Search error:', error);
      setBingError(error.message);
    } finally {
      setBingLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1800px', margin: '0 auto', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#333' }}>🧪 Google vs Bing Reverse Image Search</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Side-by-side comparison: Google (SERP API) vs Bing (SERP API) • Testing with: <code style={{ background: '#e0e0e0', padding: '2px 6px', borderRadius: '3px' }}>Elon Musk.png</code>
      </p>
      
      {/* Test Buttons Row */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        {/* Left Column: Google Reverse Image Search */}
        <div style={{ flex: 1, border: '2px solid #007bff', borderRadius: '8px', padding: '15px', background: 'white' }}>
          <h2 style={{ marginTop: 0, color: '#007bff' }}>📸 Google Reverse Image</h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Uses <strong>Elon Musk.png</strong> → SERP API (Google engine)
          </p>
          <img 
            src={imageUrl} 
            alt="Test image" 
            style={{ width: '150px', border: '2px solid #ddd', borderRadius: '8px', marginBottom: '15px' }}
            onError={(e) => {
              console.error('❌ Failed to load test image:', imageUrl);
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
          />
          <button
            onClick={handleGoogleSearch}
            disabled={googleLoading}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '16px',
              background: googleLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginBottom: '15px'
            }}
          >
            {googleLoading ? '⏳ Testing...' : '🔍 Test Google'}
          </button>

          {googleError && (
            <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '10px', color: '#721c24', fontSize: '14px' }}>
              <strong>Error:</strong> {googleError}
            </div>
          )}

          {/* Display first 4 images from Google */}
          {googleRawResults?.images && googleRawResults.images.length > 0 && (
            <div style={{ 
              background: '#e7f3ff', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid #007bff'
            }}>
              <h4 style={{ marginTop: 0, color: '#007bff', fontSize: '14px' }}>
                🖼️ First 4 Images from Results (Total: {googleRawResults.images.length})
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '10px' 
              }}>
                {googleRawResults.images.slice(0, 4).map((img: any, idx: number) => (
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
                        e.currentTarget.style.display = 'none';
                        const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
                        if (errorDiv) errorDiv.style.display = 'block';
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Writer Payload Preview */}
          {googleWriterPayload && (
            <div style={{ 
              background: '#fff8dc', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid #ffc107',
              marginTop: '15px'
            }}>
              <h4 style={{ marginTop: 0, color: '#ff6f00', fontSize: '14px' }}>
                📦 Writer Agent Payload (what RetrieverAgent sends to Writer)
              </h4>
              <div style={{ 
                background: 'white', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'monospace'
              }}>
                <div style={{ marginBottom: '5px' }}>
                  <strong>query:</strong> <span style={{ color: '#666' }}>"{googleWriterPayload.query}"</span> <em style={{ color: '#999' }}>(empty for image-only)</em>
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>results:</strong> <span style={{ color: '#007bff', fontWeight: 'bold' }}>{googleWriterPayload.results.length}</span> web results
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>images:</strong> <span style={{ color: '#007bff', fontWeight: 'bold' }}>{googleWriterPayload.images.length}</span> images
                </div>
                <div>
                  <strong>videos:</strong> <span style={{ color: '#666' }}>{googleWriterPayload.videos.length}</span> videos
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Bing Reverse Image Search */}
        <div style={{ flex: 1, border: '2px solid #28a745', borderRadius: '8px', padding: '15px', background: 'white' }}>
          <h2 style={{ marginTop: 0, color: '#28a745' }}>🔎 Bing Reverse Image</h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Uses <strong>Elon Musk.png</strong> → SERP API (Bing engine)
          </p>
          <img 
            src={imageUrl} 
            alt="Test image" 
            style={{ width: '150px', border: '2px solid #ddd', borderRadius: '8px', marginBottom: '15px' }}
            onError={(e) => {
              console.error('❌ Failed to load test image:', imageUrl);
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
          />
          <button
            onClick={handleBingSearch}
            disabled={bingLoading}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '16px',
              background: bingLoading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: bingLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginBottom: '15px'
            }}
          >
            {bingLoading ? '⏳ Testing...' : '🔍 Test Bing'}
          </button>

          {bingError && (
            <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '10px', color: '#721c24', fontSize: '14px' }}>
              <strong>Error:</strong> {bingError}
            </div>
          )}

          {/* Display first 4 images from Bing */}
          {bingRawResults?.images && bingRawResults.images.length > 0 && (
            <div style={{ 
              background: '#d4edda', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid #28a745'
            }}>
              <h4 style={{ marginTop: 0, color: '#28a745', fontSize: '14px' }}>
                🖼️ First 4 Images from Results (Total: {bingRawResults.images.length})
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '10px' 
              }}>
                {bingRawResults.images.slice(0, 4).map((img: any, idx: number) => (
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
                        e.currentTarget.style.display = 'none';
                        const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
                        if (errorDiv) errorDiv.style.display = 'block';
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
                      📐 {img.width && img.height ? `${img.width}x${img.height}` : 'Unknown size'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Writer Payload Preview */}
          {bingWriterPayload && (
            <div style={{ 
              background: '#fff8dc', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid #ffc107',
              marginTop: '15px'
            }}>
              <h4 style={{ marginTop: 0, color: '#ff6f00', fontSize: '14px' }}>
                📦 Writer Agent Payload (what RetrieverAgent sends to Writer)
              </h4>
              <div style={{ 
                background: 'white', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'monospace'
              }}>
                <div style={{ marginBottom: '5px' }}>
                  <strong>query:</strong> <span style={{ color: '#666' }}>"{bingWriterPayload.query}"</span> <em style={{ color: '#999' }}>(empty for image-only)</em>
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>results:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>{bingWriterPayload.results.length}</span> web results
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <strong>images:</strong> <span style={{ color: '#28a745', fontWeight: 'bold' }}>{bingWriterPayload.images.length}</span> images
                </div>
                <div>
                  <strong>videos:</strong> <span style={{ color: '#666' }}>{bingWriterPayload.videos.length}</span> videos
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Row - Two Column Layout for JSON */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column: Google Results */}
        <div>
          {googleRawResults && (
            <div style={{ marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3 style={{ color: '#007bff', marginTop: 0 }}>📦 Raw Tool Results (googleReverseImageSearchTool)</h3>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Summary:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#333' }}>
                  <li>Web results: {googleRawResults.web?.length || 0}</li>
                  <li>Images: {googleRawResults.images?.length || 0}</li>
                  <li>Related searches: {googleRawResults.relatedSearches?.length || 0}</li>
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
                  {JSON.stringify(googleRawResults, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Right Column: Bing Results */}
        <div>
          {bingRawResults && (
            <div style={{ marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3 style={{ color: '#28a745', marginTop: 0 }}>📦 Raw Tool Results (bingReverseImageSearchTool)</h3>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Summary:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#333' }}>
                  <li>Web results: {bingRawResults.web?.length || 0}</li>
                  <li>Images: {bingRawResults.images?.length || 0}</li>
                  <li>Related searches: {bingRawResults.relatedSearches?.length || 0}</li>
                  {bingRawResults.totalMatches && <li>Total matches: {bingRawResults.totalMatches}</li>}
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
                  {JSON.stringify(bingRawResults, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '30px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <h3 style={{ marginTop: 0, color: '#856404' }}>📋 How to Use This Test</h3>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
          <li><strong>Click "Test Google"</strong> - Calls Google Reverse Image Search via SERP API</li>
          <li><strong>Click "Test Bing"</strong> - Calls Bing Reverse Image Search via SERP API</li>
          <li><strong>Compare Image Quality</strong> - Check the 2x2 grid (Bing should have higher resolution)</li>
          <li><strong>Compare JSON Results</strong> - Expand to see full response structure</li>
          <li><strong>Check Metadata</strong> - Bing includes width, height, format, file size</li>
        </ol>
        <p style={{ marginBottom: 0, marginTop: '10px', fontSize: '14px', color: '#856404' }}>
          <strong>Expected:</strong> Bing images should be clearer/higher resolution than Google thumbnails
        </p>
      </div>
    </div>
  );
}
