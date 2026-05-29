// Supabase Edge Function code removed for local TypeScript compatibility.
// Deploy the edge function code in a separate file for Supabase (Deno runtime).

// test-openai-chat.ts
// Test file to call OpenAI chat completion using the key from the edge function
import OpenAI from "openai";

// Test 1: Check if OPENAI_API_KEY is available via edge function
async function testOpenAIKeyAvailable() {
  const res = await fetch("/functions/v1/openai-key");
  const data = await res.json();
  if (data.apiKey) {
    console.log("OPENAI_API_KEY is available:", data.apiKey);
  } else {
    console.error("OPENAI_API_KEY not found", data);
  }
}

// Test 2: Make a simple OpenAI call via edge function
async function testOpenAICall() {
  const res = await fetch("/functions/v1/fetch-openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt: "Write a one-sentence bedtime story about a unicorn." })
  });
  const data = await res.json();
  if (data.text) {
    console.log("OpenAI response:", data.text);
  } else {
    console.error("OpenAI call failed", data);
  }
}

// Run both tests
testOpenAIKeyAvailable();
testOpenAICall();
