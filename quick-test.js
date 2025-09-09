#!/usr/bin/env node

// Quick test to see if the Netlify function is responding at all
async function quickTest() {
  console.log('Testing Netlify function response...');
  
  const testPayload = {
    model: "gpt-4o-mini",
    query: "What is AI?",
    searchResults: [
      {
        title: "AI Introduction",
        content: "AI is artificial intelligence",
        url: "https://example.com"
      }
    ]
  };

  try {
    console.log('Sending request...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch('http://localhost:8888/api/fetch-openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('Response received! Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Success!');
    console.log('Response keys:', Object.keys(data));
    console.log('Has output_text:', !!data.output_text);
    console.log('Output text length:', data.output_text?.length || 0);
    console.log('First 200 chars:', data.output_text?.slice(0, 200));
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Request timed out after 30 seconds');
    } else {
      console.error('❌ Request failed:', error.message);
    }
  }
}

quickTest().catch(console.error);
