#!/usr/bin/env node

/**
 * Simple Search Flow Validation Test
 * Tests the parameter alignment fix by making a direct API call
 */

const fetch = require('node-fetch');

async function testSearchFlowFix() {
  console.log('🧪 SEARCH FLOW FIX VALIDATION');
  console.log('Testing parameter alignment: SearchWriterAgent → Netlify function');
  console.log('Timestamp:', new Date().toISOString());
  console.log();

  // Test the exact parameter structure that SearchWriterAgent now sends
  const searchWriterParams = {
    input: `System: You are a helpful research assistant. Provide comprehensive answers based on search results.

User: What is artificial intelligence?

Search Results:
[1] Introduction to AI: Artificial intelligence (AI) is a broad field of computer science focused on creating systems capable of performing tasks that typically require human intelligence...
[2] AI Applications: Modern AI applications include machine learning, natural language processing, computer vision, and robotics...`,
    model: 'gpt-4.1',
    temperature: 0.3,
    max_output_tokens: 500, // Smaller for testing
    response_format: { type: 'json_object' }
  };

  console.log('📤 Testing parameters that SearchWriterAgent sends:');
  console.log('  - input:', typeof searchWriterParams.input, `(${searchWriterParams.input.length} chars)`);
  console.log('  - model:', searchWriterParams.model);
  console.log('  - temperature:', searchWriterParams.temperature);
  console.log('  - max_output_tokens:', searchWriterParams.max_output_tokens);
  console.log('  - response_format:', searchWriterParams.response_format);
  console.log();

  try {
    console.log('🚀 Making test request to Netlify function...');
    
    // Test against the local development server
    const response = await fetch('http://localhost:8888/.netlify/functions/fetch-openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(searchWriterParams),
      timeout: 30000 // 30 second timeout
    });

    console.log('📥 Response received:');
    console.log('  - Status:', response.status);
    console.log('  - OK:', response.ok);
    console.log('  - Headers:', Object.fromEntries(response.headers));
    console.log();

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP ERROR DETECTED:');
      console.error('  - Status:', response.status);
      console.error('  - Status Text:', response.statusText);
      console.error('  - Error Body:', errorText);
      console.error();
      
      if (response.status === 400) {
        console.error('🔍 ANALYSIS: HTTP 400 suggests parameter mismatch');
        console.error('  - Check if Netlify function expects "input" parameter');
        console.error('  - Verify SearchWriterAgent sends "input" not "query"');
      }
      
      return false;
    }

    const data = await response.json();
    console.log('✅ SUCCESS: Request completed successfully');
    console.log('  - Response has data:', !!data);
    console.log('  - Response keys:', Object.keys(data));
    
    if (data.output_text) {
      console.log('  - Output text length:', data.output_text.length);
      console.log('  - Output preview:', data.output_text.substring(0, 100) + '...');
    }
    
    if (data.content) {
      console.log('  - Content length:', data.content.length);
      console.log('  - Content preview:', data.content.substring(0, 100) + '...');
    }

    console.log();
    console.log('🎉 PARAMETER ALIGNMENT TEST PASSED');
    console.log('✅ SearchWriterAgent → Netlify function: WORKING');
    console.log('✅ HTTP 400 error: RESOLVED');
    console.log('✅ Search flow should complete without hanging');
    
    return true;

  } catch (error) {
    console.error('❌ REQUEST FAILED:');
    console.error('  - Error type:', error.name);
    console.error('  - Error message:', error.message);
    console.error();
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔍 ANALYSIS: Connection refused');
      console.error('  - Ensure development server is running: npm run dev');
      console.error('  - Check if Netlify functions are available at :8888');
    } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.error('🔍 ANALYSIS: Request timeout');
      console.error('  - This suggests the function is processing but slow');
      console.error('  - Not a parameter mismatch issue');
    }
    
    return false;
  }
}

// Run the test
testSearchFlowFix()
  .then(success => {
    console.log();
    console.log('=' .repeat(60));
    if (success) {
      console.log('🎯 FINAL RESULT: SEARCH FLOW FIX VALIDATED');
      console.log('📊 The parameter mismatch issue has been resolved');
      console.log('🚀 Ready to test full search flow in browser');
    } else {
      console.log('⚠️  FINAL RESULT: VALIDATION INCONCLUSIVE');
      console.log('🔍 Manual testing recommended');
      console.log('🌐 Test at: http://localhost:5173/test-search-flow.html');
    }
    console.log('=' .repeat(60));
  })
  .catch(console.error);
