// Test script to verify search flow fixes
// Run this with: node test-search-fix.js

import { performSearch } from './src/services/search/searchService.ts';
import { logger } from './src/utils/logger.ts';

async function testSearchFlow() {
  console.log('=== Testing Search Flow Fix ===');
  
  const testQuery = 'artificial intelligence trends 2024';
  let statusUpdates = [];
  
  const onStatusUpdate = (status) => {
    console.log(`Status: ${status}`);
    statusUpdates.push(status);
  };
  
  try {
    console.log('Starting regular search test...');
    
    const result = await performSearch(testQuery, {
      isPro: false,
      onStatusUpdate
    });
    
    console.log('\n=== Search Result ===');
    console.log('Success:', !!result);
    console.log('Answer length:', result.answer?.length || 0);
    console.log('Sources count:', result.sources?.length || 0);
    console.log('Citations count:', result.citations?.length || 0);
    console.log('Provider:', result.provider);
    
    console.log('\n=== Status Updates ===');
    statusUpdates.forEach((status, index) => {
      console.log(`${index + 1}. ${status}`);
    });
    
    // Check if we reached the writer agent
    const writerStarted = statusUpdates.some(status => 
      status.includes('Writer agent starting') || 
      status.includes('Starting article generation')
    );
    
    const writerCompleted = statusUpdates.some(status => 
      status.includes('Article generation completed')
    );
    
    console.log('\n=== Flow Analysis ===');
    console.log('Writer agent started:', writerStarted);
    console.log('Writer agent completed:', writerCompleted);
    console.log('Flow completed successfully:', writerStarted && writerCompleted);
    
    if (!writerStarted) {
      console.error('❌ Issue: Writer agent never started - search flow is still hanging');
    } else if (!writerCompleted) {
      console.error('❌ Issue: Writer agent started but never completed');
    } else {
      console.log('✅ Search flow working correctly!');
    }
    
  } catch (error) {
    console.error('Search test failed:', error);
  }
}

// Run the test
testSearchFlow().catch(console.error);
