import React, { useState } from 'react';
import { WriterAgent } from '../../services/agents/writerAgent';
import { ResearchResult } from '../../services/agents/types';
import { logger } from '../../utils/logger';

export const WriterAgentTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setTesting(true);
    setError(null);
    setResult(null);

    try {
      logger.info('Starting WriterAgent test...');
      
      const testData: ResearchResult = {
        query: 'test query',
        perspectives: [],
        results: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            content: 'This is test content for the search result.'
          }
        ]
      };

      const writerAgent = new WriterAgent();
      const startTime = Date.now();
      
      logger.info('Calling WriterAgent.execute...');
      const response = await writerAgent.execute(testData);
      
      const endTime = Date.now();
      logger.info('WriterAgent test completed', {
        timeTaken: endTime - startTime,
        success: response.success
      });

      setResult(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('WriterAgent test failed:', err);
      setError(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-md">
      <h3 className="font-bold mb-2">WriterAgent Test</h3>
      
      <button
        onClick={runTest}
        disabled={testing}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Test WriterAgent'}
      </button>

      {testing && (
        <div className="mt-2 text-sm text-gray-600">
          Running test... Check console for logs.
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-600">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="mt-2 text-sm">
          <div className="text-green-600 mb-1">
            Success: {result.success ? 'Yes' : 'No'}
          </div>
          {result.data && (
            <div className="text-gray-700 dark:text-gray-300">
              Content length: {result.data.content?.length || 0} chars
            </div>
          )}
        </div>
      )}
    </div>
  );
};
