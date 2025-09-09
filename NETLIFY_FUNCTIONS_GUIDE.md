# Netlify Functions Guide for CuriosAI

## Overview

This guide documents the implementation of Netlify Functions in CuriosAI, based on working agent patterns and the official Netlify Functions documentation. Our functions serve as secure proxies for the OpenAI Responses API while supporting Swarm-inspired multi-agent architecture.

## Architecture

### Core Function: `fetch-openai.js`

The primary function that handles all OpenAI API requests with enhanced performance and Swarm architecture support.

**Location**: `/netlify/functions/fetch-openai.js`

**Purpose**: 
- Secure proxy to OpenAI Responses API
- Supports both direct input and search result integration
- Optimized for performance with token limiting
- Swarm architecture compatible

### Key Features

#### 1. **Responses API Integration**
```javascript
// Uses OpenAI Responses API endpoint
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify(openAIRequestBody)
});
```

#### 2. **Dual Input Support**
- **Direct Input**: For simple agent requests
- **Swarm Architecture**: Query + search results combination

```javascript
// Swarm architecture support
if (query && searchResults) {
  const searchContext = Array.isArray(searchResults) ? searchResults
    .slice(0, 5) // Performance optimization
    .map((result, index) => `[${index + 1}] ${result.title}: ${result.content?.slice(0, 200)}...`)
    .join('\n\n') : '';
  
  finalInput = `Query: ${query}\n\nRelevant Search Results:\n${searchContext}`;
}
```

#### 3. **Performance Optimizations**
- Token estimation and truncation
- Content length limits (200 chars per result)
- Maximum 5 search results per request
- Aggressive capping at 2500 tokens

```javascript
// Token estimation and truncation
const estimatedTokens = contentToEstimate.length / 4;
if (estimatedTokens > 2500) {
  const maxChars = 2500 * 4;
  finalInput = finalInput.slice(0, maxChars) + '...[truncated for performance]';
}
```

## Working Agent Patterns

### 1. BaseAgent Integration

All agents use the `secureOpenAI` service which internally calls our Netlify function:

```typescript
// From secureOpenAI.ts
async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const resp = await this.createResponse({
    model: this.getDefaultModel(request.model),
    messages: request.messages,
    temperature: request.temperature,
    response_format: request.response_format
  });
  
  const text = resp.output_text || resp.content?.[0]?.text || '';
  return {
    choices: [{ message: { content: text, role: 'assistant' }, finish_reason: 'stop' }]
  };
}
```

### 2. Working Agent Examples

#### Research WriterAgent Pattern
```typescript
export class WriterAgent extends BaseAgent {
  async execute(query: string, results: SearchResult[]): Promise<AgentResponse<ResearchData>> {
    return await this.safeOpenAICall(
      async () => {
        const completion = await this.openai!.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'System prompt...' },
            { role: 'user', content: `Query: ${query}\n\nSources:\n${context}` }
          ],
          response_format: { type: "json_object" }
        });
        
        const content = completion.choices[0]?.message?.content;
        const data = await this.safeJsonParse(content);
        return { success: true, data };
      },
      { success: true, data: this.getFallbackData() }
    );
  }
}
```

#### InsightsWorkflow Pattern
```typescript
async function plannerAgent(query: string, focusMode?: string): Promise<SearchPlan> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Journalist planning prompt...' },
      { role: 'user', content: `Create strategy for: "${query}"` }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7
  });
  
  const content = completion.choices[0]?.message?.content;
  return JSON.parse(content) as SearchPlan;
}
```

## ES Modules and TypeScript

### Current Status

✅ **Working (ES Modules + Responses API)**:
- BaseAgent (`/src/services/agents/baseAgent.ts`)
- Research WriterAgent (`/src/services/research/writerAgent.ts`)
- PlannerAgent (`/src/services/research/plannerAgent.ts`)
- InsightsWorkflow (`/src/services/agents/insightsWorkflow.ts`)
- ResearcherWorkflow (`/src/services/agents/researcherWorkflow.ts`)
- RetrieverAgent (`/src/services/agents/retrieverAgent.ts`)

🔧 **Updated (Search Flow)**:
- WriterAgent (`/src/services/agents/writerAgent.ts`) - Optimized for performance

### ES Module Pattern

All TypeScript agents use ES module imports:

```typescript
import { BaseAgent } from './baseAgent';
import { AgentResponse, ResearchResult } from './types';
import { logger } from '../../utils/logger';
import { secureOpenAI } from '../secureOpenAI';

export class AgentName extends BaseAgent {
  constructor() {
    super('Agent Name', 'Agent instructions');
  }
  
  async execute(...args: any[]): Promise<AgentResponse> {
    // Implementation using this.openai.chat.completions.create()
  }
}
```

## Environment Variables

### Required Variables

Set in Netlify dashboard under **Site settings > Environment variables**:

```env
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...           # Optional
OPENAI_PROJECT_ID=proj-...      # Optional
```

### Security Notes

- API keys are only accessible server-side in Netlify functions
- Client-side code never has direct access to credentials
- All requests are proxied through secure functions

## Error Handling

### Function-Level Error Handling

```javascript
try {
  const response = await fetch('https://api.openai.com/v1/responses', {
    // request config
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    return {
      statusCode: response.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `OpenAI API error: ${response.status}` })
    };
  }
  
  const data = await response.json();
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data)
  };
} catch (error) {
  return {
    statusCode: 500,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: error.message })
  };
}
```

### Agent-Level Error Handling

```typescript
// BaseAgent provides standardized error handling
protected async safeOpenAICall<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!this.openai) return fallback;
  
  try {
    return await rateLimitQueue.add(async () => {
      try {
        return await operation();
      } catch (error) {
        if (error.message.includes('429') || error.message.includes('quota')) {
          return fallback;
        }
        throw error;
      }
    });
  } catch (error) {
    console.warn(`${this.name}: OpenAI call failed:`, error);
    return fallback;
  }
}
```

## Performance Optimizations

### 1. Token Management

```javascript
// Estimate tokens (4 chars ≈ 1 token)
const estimatedTokens = content.length / 4;

// Aggressive truncation for performance
if (estimatedTokens > 2500) {
  content = content.slice(0, 2500 * 4) + '...[truncated]';
}
```

### 2. Content Limits

```typescript
// WriterAgent optimizations
const maxResults = 5; // Limit search results
const maxContentPerResult = 300; // Limit content length

const context = research.results
  .slice(0, maxResults)
  .map((result, index) => {
    const truncatedContent = result.content.length > maxContentPerResult 
      ? result.content.slice(0, maxContentPerResult) + '...'
      : result.content;
    return `Source ${index + 1}: ${result.url}\nTitle: ${result.title}\nContent: ${truncatedContent}`;
  })
  .join('\n\n');
```

### 3. Model Configuration

```typescript
// Optimized model settings
const completion = await this.openai!.chat.completions.create({
  model: 'gpt-4o-mini',           // Fast, cost-effective model
  temperature: 0.3,               // Lower temperature for consistency
  max_tokens: 1200,               // Reasonable limit
  response_format: { type: "json_object" } // Structured output
});
```

## Search Flow Architecture

### Current Search Flow Agents

The Search flow in CuriosAI uses a coordinated set of agents managed by the `SwarmController`. All agents use ES modules and the Responses API through the `secureOpenAI` service.

#### 1. **SwarmController** (`/src/services/agents/swarmController.ts`)
- **Role**: Orchestrates the entire search flow
- **ES Modules**: ✅ Uses `import/export` syntax
- **Responses API**: ✅ Via `secureOpenAI` service
- **Flow**: RetrieverAgent → PerspectiveAgent (Pro) → WriterAgent

```typescript
// SwarmController workflow
async processQuery(query: string, onStatusUpdate?: Function, isPro: boolean = false) {
  // 1. Search with RetrieverAgent
  const searchResponse = await this.retrieverAgent.execute(query, [], isPro, onStatusUpdate);
  
  // 2. Generate perspectives (Pro only)
  let perspectives = [];
  if (isPro) {
    const perspectiveResponse = await this.perspectiveAgent.execute(query);
    perspectives = perspectiveResponse.data?.perspectives || [];
  }
  
  // 3. Generate article with WriterAgent
  const writerResponse = await this.writerAgent.execute({
    query,
    perspectives,
    results: searchResponse.data?.results || []
  });
  
  return { research, article, images, videos };
}
```

#### 2. **RetrieverAgent** (`/src/services/agents/retrieverAgent.ts`)
- **Role**: Handles search execution and result processing
- **ES Modules**: ✅ Uses `import/export` syntax
- **Responses API**: ✅ Via BaseAgent inheritance
- **Features**:
  - Pro searches use Tavily API
  - Regular searches use Brave Search with SearXNG fallback
  - Processes images, videos, and perspectives
  - Comprehensive error handling and timeouts

```typescript
// RetrieverAgent pattern
export class RetrieverAgent extends BaseAgent {
  async execute(query: string, perspectives: any[] = [], isPro: boolean = false, onStatusUpdate?: Function) {
    // Choose search provider based on isPro flag
    if (isPro) {
      const tavilyResults = await tavilySearch(trimmedQuery);
      searchResults = { web: tavilyResults.web, images: tavilyResults.images, videos: [] };
    } else {
      const braveResults = await braveSearch(trimmedQuery);
      searchResults = { web: [...braveResults.web, ...braveResults.news], images: braveResults.images };
    }
    // Process and return results
  }
}
```

#### 3. **WriterAgent** (`/src/services/agents/writerAgent.ts`) - **Recently Optimized**
- **Role**: Generates final comprehensive articles
- **ES Modules**: ✅ Uses `import/export` syntax  
- **Responses API**: ✅ Via BaseAgent inheritance
- **Performance Optimizations**:
  - Limited to 5 search results max
  - 300 characters per result content
  - 1200 max tokens for responses
  - Aggressive timeout handling (45 seconds)

```typescript
// WriterAgent optimized pattern
export class WriterAgent extends BaseAgent {
  async execute(research: ResearchResult): Promise<AgentResponse> {
    // Performance optimizations
    const maxResults = 5;
    const maxContentPerResult = 300;
    
    const context = research.results
      .slice(0, maxResults)
      .map((result, index) => {
        const truncatedContent = result.content.length > maxContentPerResult 
          ? result.content.slice(0, maxContentPerResult) + '...'
          : result.content;
        return `Source ${index + 1}: ${result.url}\nTitle: ${result.title}\nContent: ${truncatedContent}`;
      })
      .join('\n\n');

    return await this.safeOpenAICall(
      async () => {
        const completion = await this.openai!.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [/* optimized prompts */],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 1200
        });
        // Process and return structured response
      },
      { success: true, data: this.getFallbackData() }
    );
  }
}
```

#### 4. **PerspectiveAgent** (`/src/services/agents/perspectiveAgent.ts`)
- **Role**: Generates different viewpoints for Pro searches
- **ES Modules**: ✅ Uses `import/export` syntax
- **Responses API**: ✅ Via BaseAgent inheritance
- **Features**:
  - Generates 2-3 unique perspectives per query
  - JSON-structured output with id, title, description
  - 1-second delay for rate limiting

```typescript
// PerspectiveAgent pattern
export class PerspectiveAgent extends BaseAgent {
  async execute(query: string): Promise<AgentResponse> {
    await this.delay(1000); // Rate limiting
    const perspectives = await this.generatePerspectives(query);
    return { success: true, data: { perspectives } };
  }

  private async generatePerspectives(query: string): Promise<Perspective[]> {
    return this.safeOpenAICall(
      async () => {
        const completion = await this.openai!.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [/* perspective generation prompts */],
          temperature: 0.7,
          response_format: { type: "json_object" }
        });
        // Parse and return perspectives
      },
      this.getFallbackData()
    );
  }
}
```

### ES Modules Verification Status

All Search flow agents have been verified to use proper ES modules syntax:

✅ **Verified ES Modules Usage**:
- `SwarmController` - Uses `import/export`, extends patterns
- `RetrieverAgent` - Uses `import/export`, extends BaseAgent
- `WriterAgent` - Uses `import/export`, extends BaseAgent (**Recently optimized**)
- `PerspectiveAgent` - Uses `import/export`, extends BaseAgent
- `BaseAgent` - Foundation class with ES modules
- `secureOpenAI` - Service using ES modules and Responses API

✅ **Responses API Integration**:
- All agents use `this.openai.chat.completions.create()`
- Calls are routed through `secureOpenAI` service
- Service internally uses `/api/fetch-openai` Netlify function
- Function uses OpenAI Responses API endpoint

### Search Flow Performance Optimizations

#### Token Management
```javascript
// In fetch-openai.js
const estimatedTokens = contentToEstimate.length / 4;
if (estimatedTokens > 2500) {
  const maxChars = 2500 * 4;
  finalInput = finalInput.slice(0, maxChars) + '...[truncated for performance]';
}
```

#### WriterAgent Optimizations
```typescript
// Performance limits applied
const maxResults = 5; // Limit search results
const maxContentPerResult = 300; // Limit content length
const maxTokens = 1200; // Reasonable response limit
const timeout = 45000; // 45-second timeout
```

#### Timeout Handling
```typescript
// SwarmController timeout management
const writerResponse = await Promise.race([
  this.writerAgent.execute(research),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('WriterAgent timeout after 45 seconds')), 45000)
  )
]);
```

### Search Flow Error Handling

#### Fallback Strategy
```typescript
// WriterAgent fallback when timeout occurs
writerResponse = {
  success: true,
  data: {
    content: `Based on the search results for "${query}", here are the key findings...`,
    followUpQuestions: [
      `What are the latest developments regarding ${query}?`,
      `How does ${query} impact different industries?`,
      `What are the main challenges with ${query}?`
    ],
    citations: searchResponse.data?.results?.map((r: any) => r.url) || []
  }
};
```

#### Service Health Monitoring
```typescript
// SwarmController health checks
private async executeWithHealthCheck<T>(operation: () => Promise<T>, serviceName: string): Promise<T> {
  if (!this.healthMonitor.isHealthy(serviceName)) {
    throw new Error(`Service ${serviceName} is currently unavailable`);
  }
  const result = await operation();
  this.healthMonitor.reportSuccess(serviceName);
  return result;
}
```

## Troubleshooting

### Common Issues

1. **Timeout Errors**
   - Check token limits and content length
   - Verify network connectivity
   - Review function timeout settings

2. **API Key Issues**
   - Verify environment variables are set
   - Check API key permissions
   - Monitor usage quotas

3. **CORS Issues**
   - Ensure proper headers in all responses
   - Handle OPTIONS preflight requests
   - Check domain configurations

### Debug Commands

```bash
# Check function logs
netlify functions:list
netlify dev --functions-port 8888

# Test function locally
curl -X POST http://localhost:8888/api/fetch-openai \
  -H "Content-Type: application/json" \
  -d '{"input": "test query"}'
```

## Future Enhancements

1. **Streaming Responses** - Implement streaming for real-time updates
2. **Enhanced Caching** - Add Redis/memory caching for frequently requested data  
3. **Function Composition** - Chain multiple functions for complex workflows
4. **Monitoring Dashboard** - Real-time function performance monitoring

This guide provides a comprehensive foundation for working with Netlify Functions in the CuriosAI multi-agent architecture while maintaining performance, security, and reliability.
