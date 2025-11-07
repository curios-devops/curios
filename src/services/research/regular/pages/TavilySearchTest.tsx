import { useState } from 'react';
import { searchWithTavily } from '../../../../commonService/searchTools/tavilyService';

export default function TavilySearchTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const runTest = async () => {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      console.log('🔍 Testing Tavily search with "who is leo messi"...');
      const response = await searchWithTavily('who is leo messi');
      
      console.log('📦 Raw Tavily Response:', response);
      console.log('🖼️ Images count:', response.images?.length || 0);
      console.log('📄 Results count:', response.results?.length || 0);
      
      if (response.images && response.images.length > 0) {
        console.log('✅ First image:', response.images[0]);
      } else {
        console.log('❌ No images returned');
      }

      setResults(response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Test failed:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#111', 
      color: '#fff', 
      padding: '40px',
      fontFamily: 'system-ui'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>
        Hello World - Tavily Search Test
      </h1>

      <button 
        onClick={runTest}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: loading ? '#555' : '#0095FF',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '30px'
        }}
      >
        {loading ? 'Testing...' : 'Run Test: "who is leo messi"'}
      </button>

      {error && (
        <div style={{
          padding: '20px',
          backgroundColor: '#ff3333',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Results:</h2>
          
          <div style={{ 
            backgroundColor: '#222', 
            padding: '20px', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Summary:</h3>
            <p>📄 Web Results: {results.results?.length || 0}</p>
            <p>🖼️ Images: {results.images?.length || 0}</p>
          </div>

          {results.images && results.images.length > 0 && (
            <div style={{ 
              backgroundColor: '#222', 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>
                ✅ First Image Result:
              </h3>
              <div style={{ marginBottom: '15px' }}>
                <p><strong>URL:</strong> {results.images[0].url}</p>
                {results.images[0].description && (
                  <p><strong>Description:</strong> {results.images[0].description}</p>
                )}
                {results.images[0].alt && (
                  <p><strong>Alt:</strong> {results.images[0].alt}</p>
                )}
              </div>
              <img 
                src={results.images[0].url} 
                alt={results.images[0].alt || 'Tavily result'}
                style={{ 
                  maxWidth: '400px', 
                  maxHeight: '400px',
                  borderRadius: '8px',
                  border: '2px solid #0095FF'
                }}
                onError={(e) => {
                  console.error('Image failed to load');
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {(!results.images || results.images.length === 0) && (
            <div style={{ 
              backgroundColor: '#442', 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>
                ❌ No Images Returned
              </h3>
              <p>Tavily returned 0 images. This might be because:</p>
              <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
                <li>include_images is set to false in tavilyService.ts</li>
                <li>Free tier limitations</li>
                <li>Query doesn't have associated images</li>
              </ul>
            </div>
          )}

          <details style={{ 
            backgroundColor: '#222', 
            padding: '20px', 
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            <summary style={{ fontSize: '18px', marginBottom: '10px' }}>
              📦 Full Raw Response (Click to expand)
            </summary>
            <pre style={{ 
              backgroundColor: '#111', 
              padding: '15px', 
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '12px',
              marginTop: '10px'
            }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
