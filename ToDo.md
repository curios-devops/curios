Open AI format:
import OpenAI from "openai";

const openai = new OpenAI();

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "developer", content: "You are a helpful assistant." }],
    model: "gpt-4.1-mini",
    store: true,
  });

  console.log(completion.choices[0]);
}

main();
Response
{
  "id": "chatcmpl-B9MBs8CjcvOU2jLn4n570S5qMJKcT",
  "object": "chat.completion",
  "created": 1741569952,
  "model": "gpt-4.1-2025-04-14",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?",
        "refusal": null,
        "annotations": []
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 19,
    "completion_tokens": 10,
    "total_tokens": 29,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "audio_tokens": 0
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "audio_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0
    }
  },
  "service_tier": "default"
}

1. we need to create a test for Supabase edge function , let start with a clean new page :
you can test a minimal working test, for this you can use the oficail template from supabase:

/ Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { OpenAI } from "npm:openai@4.8.0"

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
})

Deno.serve(async (req)=>{
  const { prompt } = await req.json()
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  })
  return new Response(JSON.stringify({
    text: response.choices[0].message.content
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Connection': 'keep-alive'
    }
  })
})

'''
you can use the suggested model or try new models form openaAI like GPT 4 or even 5  

Summary Table
Step	Action
1	Remove/disable old fetch-openai Netlify function
2	Ensure frontend calls Supabase Edge Function for OpenAI completions
3	Add logging before/after OpenAI fetch in frontend
4	Verify Netlify env vars for Supabase Edge Function URL/anon key
5	Redeploy and test

STEP1. made . STEP2.. I look in the code and I see a critical file bae agent that seems to call fetch-openai. so I guess we need to update to use the https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai. STEP3. Add Logging
Add console.log before and after the OpenAI fetch in your frontend to confirm:
The request is being made.
The response is received or an error occurs. Step 4: I Check Environment Variables in Netlify and they use VITE_ANON_KEY is that correct or should I need to declare without VITE? 