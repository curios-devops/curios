# OpenAI Responses API Implementation Guide

## Overview
This document outlines how the CuriosAI system successfully implements the OpenAI Responses API through Netlify functions and agent architecture. The implementation follows the official OpenAI Responses API format and provides a working pattern for all agents.

## Architecture Overview

### 1. **Netlify Function Layer** (`/netlify/functions/fetch-openai.js`)
- **Purpose**: Secure proxy to OpenAI Responses API
- **Endpoint**: `/api/fetch-openai`
- **API Format**: OpenAI v1/responses (NOT legacy chat/completions)

### 2. **SecureOpenAI Service** (`/src/services/secureOpenAI.ts`)
- **Purpose**: Frontend service that translates chat completion interface to Responses API
- **Pattern**: Provides chat.completions.create() interface but calls Responses API internally

### 3. **BaseAgent Class** (`/src/services/agents/baseAgent.ts`)
- **Purpose**: Foundation for all agents with standardized OpenAI integration
- **Key Features**: Rate limiting, error handling, fallback support

## Working Implementation Pattern

### **Proven Working Agents:**
1. ✅ **Research WriterAgent** (`/src/services/research/writerAgent.ts`)
2. ✅ **PlannerAgent** (`/src/services/research/plannerAgent.ts`)
3. ✅ **InsightsWorkflow** (`/src/services/agents/insightsWorkflow.ts`)
4. ✅ **ResearcherWorkflow** (`/src/services/agents/researcherWorkflow.ts`)

### **Agent Implementation Pattern:**

```typescript
export class WorkingAgent extends BaseAgent {
  constructor() {
    super('Agent Name', 'Agent instructions');
  }

  async execute(params): Promise<AgentResponse> {
    try {
      if (!this.openai) {
        return {
          success: true,
          data: this.getFallbackData()
        };
      }

      return await this.safeOpenAICall(
        async () => {
          const completion = await this.openai!.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 1200
          });

          const content = completion.choices[0]?.message?.content;
          if (!content) {
            throw new Error('No content generated');
          }

          const data = await this.safeJsonParse(content);
          return {
            success: true,
            data: data
          };
        },
        {
          success: true,
          data: this.getFallbackData()
        }
      );
    } catch (error) {
      logger.error('Agent execution failed:', error);
      return this.handleError(error);
    }
  }
}
```

## Netlify Function Implementation

### **Request Format to Netlify Function:**
```javascript
// POST /api/fetch-openai
{
  "model": "gpt-4o-mini",
  "input": "string or message array",
  "query": "search query", // for swarm architecture
  "searchResults": [], // for swarm architecture  
  "max_completion_tokens": 1200,
  "temperature": 0.3,
  "response_format": { "type": "json_object" },
  "reasoning_effort": "medium"
}
```

### **OpenAI Responses API Call:**
```javascript
// Inside Netlify function
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    input: finalInput,
    text: { format: { type: 'text' } }, // for gpt-5-mini
    completion: { max_tokens: 1200 }, // for other models
    reasoning: { effort: 'medium' },
    temperature: 0.3,
    store: true
  })
});
```

### **Response Format from OpenAI:**
```json
{
  "id": "resp_xxx",
  "object": "response", 
  "status": "completed",
  "output": [
    {
      "type": "message",
      "content": [
        {
          "type": "output_text",
          "text": "The actual response content"
        }
      ]
    }
  ]
}
```

### **Response Processing:**
```javascript
// Extract output_text from nested structure
let output_text = '';
if (data.output && Array.isArray(data.output)) {
  const messageOutput = data.output.find(item => item.type === 'message' && item.content);
  if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
    const textContent = messageOutput.content.find(content => content.type === 'output_text' && content.text);
    if (textContent) {
      output_text = textContent.text;
    }
  }
}

// Return enhanced response
return {
  statusCode: 200,
  body: JSON.stringify({
    ...data,
    output_text: output_text
  })
};
```

## SecureOpenAI Service Implementation

### **Chat Completion Interface:**
```typescript
async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  // Use Responses API as primary method
  const resp = await this.createResponse({
    model: this.getDefaultModel(request.model),
    messages: request.messages,
    temperature: request.temperature,
    response_format: request.response_format,
  });
  
  // Adapt Responses output to ChatCompletionResponse shape
  const text = resp.output_text || resp.content?.[0]?.text || '';
  const mapped: ChatCompletionResponse = {
    choices: [
      {
        message: { content: text, role: 'assistant' },
        finish_reason: 'stop',
      },
    ],
    usage: undefined,
  };
  
  return mapped;
}
```

### **Message to Input Mapping:**
```typescript
private mapMessagesToResponsesInput(messages: ChatCompletionRequest['messages']) {
  // Basic mapping: concatenate messages into a single string input
  const parts = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
  return parts;
}
```

## Key Differences from Legacy Chat Completions

### **API Endpoint:**
- ❌ Legacy: `POST /v1/chat/completions`
- ✅ New: `POST /v1/responses`

### **Request Structure:**
- ❌ Legacy: `{ messages: [...], model: "..." }`
- ✅ New: `{ input: "...", model: "..." }`

### **Response Structure:**
- ❌ Legacy: `{ choices: [{ message: { content: "..." } }] }`
- ✅ New: `{ output: [{ content: [{ type: "output_text", text: "..." }] }] }`

### **Model Support:**
- ✅ `gpt-4o-mini` - Standard model (supports temperature)
- ✅ `gpt-5-mini` - Reasoning model (no temperature, requires `text.format`)

## Optimization Features

### **Performance Optimizations:**
1. **Content Truncation**: Limit input to ~2500 tokens for faster processing
2. **Result Limiting**: Cap search results to 5 items
3. **Token Limits**: Use 1200 max_tokens for balance of quality/speed
4. **Aggressive Timeouts**: 30-second timeout in SwarmController

### **Error Handling:**
1. **Graceful Fallbacks**: Always return success with fallback data
2. **Rate Limiting**: Built into BaseAgent via rateLimitQueue
3. **Retry Logic**: One retry attempt on failures
4. **JSON Validation**: Safe parsing with fallback responses

## Migration Checklist for New Agents

### ✅ **Required Steps:**
1. Extend `BaseAgent` class
2. Use `this.openai!.chat.completions.create()` interface
3. Wrap OpenAI calls in `this.safeOpenAICall()`
4. Use `async () => { ... }` function syntax (NOT `async () => await`)
5. Provide fallback data for all scenarios
6. Use proper TypeScript types from `./types`
7. Use `gpt-4o-mini` model by default
8. Implement proper error handling

### ❌ **Common Mistakes:**
1. Direct OpenAI SDK usage (bypasses security)
2. Using `await` in safeOpenAICall operation function
3. Missing fallback data
4. Incorrect TypeScript types
5. Missing error handling
6. Using legacy chat/completions endpoint directly

## Testing & Validation

### **Test Pattern:**
```bash
curl -X POST http://localhost:8888/api/fetch-openai \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "input": "Test message",
    "max_completion_tokens": 100
  }'
```

### **Success Indicators:**
- Response status 200
- `output_text` field present
- Response time < 15 seconds
- Valid JSON structure
- No 400/500 errors

## Current Status

### ✅ **Working Components:**
- Netlify function proxy
- SecureOpenAI service
- BaseAgent foundation
- Research WriterAgent
- PlannerAgent  
- InsightsWorkflow
- ResearcherWorkflow

### 🔧 **Needs Fix:**
- Main WriterAgent (timeout issues)
- SwarmController timeout handling
- TypeScript compilation errors

This implementation successfully migrates from the legacy Chat Completions API to the modern Responses API while maintaining backward compatibility through the chat completion interface.
