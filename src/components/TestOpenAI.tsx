import { useState } from 'react';
import { createResponse } from '../services/openai/directApi';

export function TestOpenAI() {
  const [input, setInput] = useState('Write a haiku about code');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await createResponse(input, {
        model: 'gpt-4',
        effort: 'low',
        verbosity: 'medium',
      });
      setResponse(result.output_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Test OpenAI API</h2>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label htmlFor="prompt" className="block mb-2 font-medium">
            Enter your prompt:
          </label>
          <input
            id="prompt"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={loading}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send to OpenAI'}
        </button>
      </form>

      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Response:</h3>
          <p className="whitespace-pre-line">{response}</p>
        </div>
      )}
    </div>
  );
}
