# OpenAI Responses API Implementation Learnings

## Overview
This document captures the critical learnings from implementing the OpenAI Responses API (gpt-4.1) in a Netlify Functions environment, including the specific parameter formats, common pitfalls, and working solutions.

## Key Findings

### 1. **API Parameter Format Changes**

The OpenAI Responses API has significantly different parameter structures compared to the Chat Completions API:

#### ❌ **Old Chat Completions Format (DOESN'T WORK)**
```javascript
// This format causes 400 errors
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." }
  ],
  temperature: 0.3,
  max_tokens: 2000,
  response_format: { type: "json_object" }
});
```

#### ✅ **New Responses API Format (WORKS)**
```javascript
// Correct format for Responses API
const response = await openai.responses.create({
  model: "gpt-4.1",
  input: "System: ...\n\nUser: ...", // Single string, not message array
  temperature: 0.3,
  max_output_tokens: 2000, // Changed from max_tokens
  text: { 
    format: { type: "json_object" } // Changed from response_format
  }
  // Note: reasoning.effort is NOT supported with gpt-4.1
});
```

### 2. **Critical Parameter Differences**

| Chat Completions API | Responses API | Notes |
|---------------------|---------------|-------|
| `messages: [...]` | `input: "string"` | Must flatten messages to single string |
| `max_tokens` | `max_output_tokens` | Parameter name changed |
| `response_format: { type: "json_object" }` | `text: { format: { type: "json_object" } }` | Nested structure |
| `reasoning_effort` | ❌ Not supported | Causes 400 error with gpt-4.1 |

### 3. **Response Structure Changes**

#### ❌ **Old Response Format**
```javascript
// Chat Completions response
const content = response.choices[0].message.content;
```

#### ✅ **New Response Format**
```javascript
// Responses API response structure
let output_text = '';
if (response.output && Array.isArray(response.output)) {
  const messageOutput = response.output.find(item => item.type === 'message');
  if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
    const textContent = messageOutput.content.find(content => content.type === 'output_text');
    if (textContent && textContent.text) {
      output_text = textContent.text;
    }
  }
}
```

## Netlify Function Implementation

### **Complete Working Function**

```javascript
// netlify/functions/fetch-openai.js
const { OpenAI } = require('openai');

// Ensure API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is not set');
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { 
      input, 
      model = 'gpt-4.1',
      temperature = 0.3,
      max_output_tokens = 2000,
      response_format // Will be converted to text.format
    } = JSON.parse(event.body);

    if (!input) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Input is required' }),
      };
    }

    // Build request parameters
    const requestParams = {
      model,
      input
    };

    // Add optional parameters only if provided
    if (temperature !== undefined) requestParams.temperature = temperature;
    if (max_output_tokens !== undefined) requestParams.max_output_tokens = max_output_tokens;
    
    // Handle response_format according to new API format
    if (response_format) {
      if (response_format.type === 'json_object') {
        requestParams.text = { format: { type: 'json_object' } };
      } else if (response_format.type === 'text') {
        requestParams.text = { format: { type: 'text' } };
      }
    }

    const response = await client.responses.create(requestParams);

    // Extract output text from response
    let output_text = '';
    if (response.output && Array.isArray(response.output)) {
      const messageOutput = response.output.find(item => item.type === 'message');
      if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
        const textContent = messageOutput.content.find(content => content.type === 'output_text');
        if (textContent && textContent.text) {
          output_text = textContent.text;
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        content: output_text,
        output_text: output_text,
        model: response.model,
        usage: response.usage,
        response_id: response.id
      }),
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to process request',
        details: error.message,
      }),
    };
  }
};
```

## Client-Side Implementation

### **Frontend Request Format**

```javascript
// Format messages for Responses API
const systemMessage = messages.find(m => m.role === 'system')?.content || '';
const userMessage = messages.find(m => m.role === 'user')?.content || '';
const input = `${systemMessage}\n\n${userMessage}`;

const response = await fetch('/.netlify/functions/fetch-openai', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({ 
    input,
    model: 'gpt-4.1',
    temperature: 0.3,
    max_output_tokens: 2000,
    response_format: { type: 'json_object' }
    // Don't include reasoning_effort - not supported with gpt-4.1
  })
});
```

## Common Error Patterns & Solutions

### **Error 1: Unsupported Parameter 'response_format'**
```
400 Unsupported parameter: 'response_format'. In the Responses API, 
this parameter has moved to 'text.format'.
```

**Solution:**
```javascript
// ❌ Wrong
response_format: { type: 'json_object' }

// ✅ Correct
text: { format: { type: 'json_object' } }
```

### **Error 2: Unsupported Parameter 'reasoning_effort'**
```
400 Unsupported parameter: 'reasoning.effort' is not supported with this model.
```

**Solution:**
```javascript
// ❌ Wrong - Don't include this parameter
reasoning: { effort: 'medium' }

// ✅ Correct - Remove it completely for gpt-4.1
// (This parameter is not supported with gpt-4.1)
```

### **Error 3: Messages Array Not Supported**
```
400 Expected string, got array
```

**Solution:**
```javascript
// ❌ Wrong
input: [
  { role: "system", content: "..." },
  { role: "user", content: "..." }
]

// ✅ Correct
input: "System: ...\n\nUser: ..."
```

## Environment Setup

### **Required Environment Variables**
```bash
# .env file
OPENAI_API_KEY=sk-proj-... # Server-side only, no VITE_ prefix
```

### **Netlify Function Dependencies**
```json
{
  "dependencies": {
    "openai": "^4.73.1"
  }
}
```

## Development Setup

### **Start Development Servers**
```bash
# Start both Vite and Netlify Dev
npm run dev

# This runs: netlify dev --dir=. --functions=netlify/functions
# Which serves:
# - Frontend: http://localhost:5173
# - Functions: http://localhost:8888/.netlify/functions/
```

### **Testing the Function**
```bash
# Test the function directly
curl -X POST http://localhost:8888/.netlify/functions/fetch-openai \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello world", "model": "gpt-4.1"}'
```

## Architecture Integration

### **Service-First Architecture Compliance**
```typescript
// Agent implementation pattern
export class SearchWriterAgent {
  private readonly netlifyFunctionUrl: string = '/.netlify/functions/fetch-openai';
  
  private async callOpenAIViaNetlify(messages: Message[]): Promise<string> {
    // Convert messages to single input string
    const input = this.formatMessagesForResponsesAPI(messages);
    
    const response = await fetch(this.netlifyFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        input,
        model: 'gpt-4.1',
        response_format: { type: 'json_object' }
      })
    });
    
    const data = await response.json();
    return data.content;
  }
  
  private formatMessagesForResponsesAPI(messages: Message[]): string {
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessage = messages.find(m => m.role === 'user')?.content || '';
    return `${systemMessage}\n\n${userMessage}`;
  }
}
```

## Key Learnings Summary

1. **Model**: Use `gpt-4.1` (not `gpt-4o-mini` or older models)
2. **Input Format**: Single string, not message array
3. **Parameters**: Use `max_output_tokens`, `text.format`, avoid `reasoning_effort`
4. **Response Parsing**: Navigate nested `output[].content[].text` structure
5. **Environment**: Keep API keys server-side only (no VITE_ prefix)
6. **Error Handling**: Implement robust fallbacks for API changes
7. **Testing**: Use Netlify Dev for local function testing

## Migration Checklist

- [ ] Update model to `gpt-4.1`
- [ ] Convert message arrays to single input strings
- [ ] Change `max_tokens` → `max_output_tokens`
- [ ] Update `response_format` → `text.format`
- [ ] Remove `reasoning_effort` parameter
- [ ] Update response parsing logic
- [ ] Test with Netlify Dev locally
- [ ] Verify environment variables are server-side only
- [ ] Implement proper error handling
- [ ] Update all agent implementations

---

**Last Updated**: September 15, 2025  
**OpenAI Responses API Version**: gpt-4.1  
**Status**: ✅ Production Ready
