import { logger } from '../utils/logger';
import { env } from '../config/env';
import { WriterAgent } from '../services/agents/writerAgent';
import { ResearchResult } from '../services/agents/types';

// Test utility to diagnose WriterAgent issues
export const testWriterAgent = async () => {
  logger.info('Testing WriterAgent initialization and execution...');
  
  // Log environment status
  logger.info('Environment status:', {
    hasOpenAIKey: !!env.openai.apiKey,
    keyLength: env.openai.apiKey?.length || 0,
    keyPreview: env.openai.apiKey?.substring(0, 7) + '...' || 'missing',
    hasOrgId: !!env.openai.orgId,
    hasProjectId: !!env.openai.projectId
  });

  // Create test research data
  const testResearch: ResearchResult = {
    query: 'test query',
    perspectives: [],
    results: [
      {
        title: 'Test Result 1',
        url: 'https://example.com/1',
        content: 'This is test content for the first result.'
      },
      {
        title: 'Test Result 2', 
        url: 'https://example.com/2',
        content: 'This is test content for the second result.'
      }
    ]
  };

  // Test WriterAgent
  try {
    logger.info('Creating WriterAgent instance...');
    const writerAgent = new WriterAgent();
    
    logger.info('Calling WriterAgent.execute...');
    const startTime = Date.now();
    
    const result = await writerAgent.execute(testResearch);
    
    const endTime = Date.now();
    logger.info('WriterAgent completed', {
      success: result.success,
      hasData: !!result.data,
      timeTaken: endTime - startTime,
      dataPreview: result.data ? Object.keys(result.data) : null
    });
    
    return result;
  } catch (error) {
    logger.error('WriterAgent test failed:', error);
    throw error;
  }
};

// Export to global for browser console testing
(window as any).testWriterAgent = testWriterAgent;
