#!/usr/bin/env node

// Simple test to check if the basic API is working
async function simpleTest() {
  console.log('Testing basic OpenAI API connection...');
  
  const testPayload = {
    model: "gpt-4o-mini",
    input: "Hello",
    max_completion_tokens: 10
  };

  const startTime = Date.now();
  
  try {
    console.log('Making request...');
    const response = await fetch('http://localhost:8888/api/fetch-openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const endTime = Date.now();
    console.log('Response received in', endTime - startTime, 'ms');
    console.log('Status:', response.status, response.statusText);

    const text = await response.text();
    console.log('Response body length:', text.length);
    console.log('Response preview:', text.slice(0, 200));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

simpleTest();
