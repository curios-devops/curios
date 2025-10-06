import { useState } from 'react';

export function TestApifySearch() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTestApify = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      // This will only work if you have a backend API route or serverless function to proxy the Apify call
      const res = await fetch('/api/test-apify?query=cat');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Test Apify Search</h2>
      <button
        onClick={handleTestApify}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 mb-4"
      >
        {loading ? 'Searching...' : 'Test "cat" search with Apify'}
      </button>
      {error && <div className="p-2 text-red-700 bg-red-100 rounded">{error}</div>}
      {result && (
        <pre className="mt-4 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
