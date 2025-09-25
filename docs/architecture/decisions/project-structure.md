# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

CuriosAI is a multi-agent AI-powered search engine built with modern web technologies. It features advanced search capabilities through specialized agents in a Swarm-inspired architecture, offering different search modes from basic web search to comprehensive research reports.

## Core Architecture

### Frontend Stack
- **React 19** with TypeScript and Vite
- **Tailwind CSS** for styling with custom dark theme
- **React Router v7** for navigation with lazy loading
- **Lucide React** for icons
- **React Markdown** for content rendering

### Backend Architecture
- **Netlify Functions** for serverless API endpoints
- **Supabase** for authentication and user management
- **Stripe** for subscription handling

### Multi-Agent System
CuriosAI implements a **Swarm-inspired multi-agent architecture** with specialized agents:

#### Search Flow Agents (Regular Search Working; Pro Search:Need to be updated)
- **SwarmController**: Orchestrates entire search workflow
- **RetrieverAgent**: Handles search execution (Brave/SearXNG as fall back ) (Tavily Pro Feature)
- **WriterAgent**: Generates comprehensive articles (recently optimized)
- **PerspectiveAgent**: Generates multiple viewpoints (Pro feature)
- **BaseAgent**: Foundation class with rate limiting and error handling

#### :Lab Flow Agents (Regular Lab: need to be refactor and completed ; Pro Lab : need to be build)
- **SwarmController**: Orchestrates entire search workflow
- **RetrieverAgent**: Handles search execution (Brave/Tavily/SearXNG)
- **WriterAgent**: Generates comprehensive articles (recently optimized)
- **PublisherAgent**: Need to be developed
- **BaseAgent**: Foundation class with rate limiting and error handling

### User System
CuriosAI implements a SImple 2 Tier System: (need to be verified/tested)
- **GuessUser**: Any user who visit the site, no need to login and unlimited access to Free Features regular feaures (Search/ Insights/ Labs)
- **Regular User - Signed User/Free tier**: User who already sign up in supabase or google, 
    has access unlimited to Free Regular feutures ((Search/ Insights/ Labs) and limited access to Pro Features (Pro Serach / Quich Reseasrch and Pro Labs) (5 times whith countdown indicator that block access when read zero)
-**Pro Users User - Stripe Subscription User/ Paid/Pro tier**: User who already sign up and Paid  (Montly /yearly)subscription in Stripe, 
    has unlimited access (while subscription is not expired) to all features (Search/ProSearch; Insights/QuickResearch; Labs/Prolabs) 
    whith no countdown indicator


## Development Commands

### Local Development
```bash
# Start development server (Vite + Netlify dev)
npm run dev

# Start Vite only (frontend development)
npm run dev:vite

# Clean build cache
npm run clean

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing and Quality
```bash
# Run OpenAI integration tests
npm test

# Run linting
npm run lint

# Build and serve Netlify functions locally
npm run functions:build
npm run functions:serve
```

### Deno Alternative (partial support)
```bash
# For simple Deno testing
deno run --allow-net --allow-read --allow-env src/main.tsx
```

## Environment Configuration

### Required Environment Variables
```env
# OpenAI Configuration (REQUIRED)
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Search APIs
VITE_BRAVE_API_KEY=your_brave_api_key_here
VITE_TAVILY_API_KEY=your_tavily_api_key_here
VITE_RAPIDAPI_KEY=your_rapidapi_key_here

# Supabase (Authentication)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe (Subscriptions)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### Netlify Environment Variables
For production deployment, set these in Netlify dashboard:
```env
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-... (optional)
OPENAI_PROJECT_ID=proj-... (optional)
```

## Core Application Structure

### Main Search Modes
1. **Search** (`/search`) - Basic web search with WriterAgent
2. **Pro Search** (`/pro-search`) - Enhanced search with 3x sources and perspectives
3. **Insights** (`/insights-results`) - Multi-agent journalistic research 
4. **Research** (`/research-results`) - SEARCH-R1 framework with 5 specialized agents
5. **Labs** (`/labs-results`) - Experimental features and task automation
6. **Pro Labs** (`/pro-labs-results`) - Advanced labs features

### Agent Architecture Patterns

#### BaseAgent Pattern (CRITICAL)
All agents MUST extend BaseAgent and follow this pattern:
```typescript
export class YourAgent extends BaseAgent {
  constructor() {
    super('Agent Name', 'Agent purpose and instructions');
  }

  async execute(...args: any[]): Promise<AgentResponse> {
    return await this.safeOpenAICall(
      async () => {
        const completion = await this.openai!.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'System prompt' },
            { role: 'user', content: 'User input' }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 1200
        });
        
        const content = completion.choices[0]?.message?.content;
        return { success: true, data: JSON.parse(content) };
      },
      { success: true, data: this.getFallbackData() }
    );
  }
}
```

## Critical Implementation Details

### OpenAI API Integration
- **All requests** go through `/api/

### Performance Optimizations (WriterAgent)
- **Maximum 5 search results** per request
- **300 characters per result content** limit
- **45-second timeout** with comprehensive fallback
- **Token estimation**: 4 chars ≈ 1 token, truncate at 2500 tokens

### Search Flow (SwarmController)
```typescript
// Typical workflow
async processQuery(query: string, isPro: boolean = false) {
  // 1. Search with RetrieverAgent
  const searchResponse = await this.retrieverAgent.execute(query, [], isPro);
  
  // 2. Generate perspectives (Pro only)
  if (isPro) {
    const perspectiveResponse = await this.perspectiveAgent.execute(query);
  }
  
  // 3. Generate article with WriterAgent
  const writerResponse = await this.writerAgent.execute(research);
  
  return { research, article, images, videos };
}
```

## User Interface Components

### Three-Tab Navigation System
- **InputContainer**: Main search interface container
- **ThreeTabSwitch**: Handles Search/Insights/Labs mode switching
- **FunctionSelector**: Manages regular vs Pro functionality
- **FunctionTooltip**: Displays feature information

### Authentication System
- **AuthContext**: Global authentication state
- **AuthModal**: Unified sign-in/sign-up interface
- **UserMenu**: Account management dropdown
- **Sign-up modal** for guest users accessing Pro features

### Theme System
- **ThemeProvider**: Dark/light theme context
- **Custom CSS variables** for consistent styling
- **Responsive design** with mobile-first approach

## Search API Integrations

### Primary APIs
- **Tavily**: Primary search service for Pro searches
- **Brave Search**: Standard web search with fallback to SearXNG
- **SearXNG (RapidAPI)**: Fallback search service

### Rate Limiting and Caching
- **1-second delays** between search requests
- **Maximum 3 parallel searches**
- **Session-based caching** for search results
- **Exponential backoff** for API errors

## Common Development Patterns

### Error Handling
Always provide fallback  and handle errors gracefully:
```typescript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed:', error);
  return { success: true, data: fallbackData };
}
```

### Component Lazy Loading
Use React.lazy for route-based code splitting:
```typescript
const SearchResults = lazy(() => import('./pages/SearchResults.tsx'));
const LazyPageWrapper = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);
```

### ES Modules (REQUIRED)
All TypeScript files must use ES module syntax:
```typescript
import { Component } from './component';
export class MyClass extends Component {}
export default MyClass;
```

## Testing and Debugging

### Local Testing
```bash
# Test OpenAI integration
node test-simple-openai.js

# Test specific components
npm run dev # Then navigate to component


```

### Common Issues
1. **Timeout errors**: Check token limits and WriterAgent optimizations
2. **API key issues**: Verify environment variables in both local and Netlify
3. **TypeScript errors**: Ensure ES modules syntax and proper imports
4. **CORS issues**: Verify Netlify function headers and redirects

## Development Guidelines

### When Adding New Agents
1. Extend `BaseAgent` class
2. Use `this.safeOpenAICall()` wrapper
3. Provide comprehensive fallback data
4. Use `gpt-4o-mini` model by default
5. Implement proper error handling
6. Add to appropriate workflow (SwarmController, etc.)

### When Adding New Search Features
1. Update RetrieverAgent with new search providers
2. Add to SearchService integration
3. Update SwarmController workflow
4. Add appropriate UI components
5. Test with various query types

### When Modifying UI Components
1. Follow existing component patterns
2. Ensure mobile responsiveness
3. Maintain dark theme compatibility
4. Use Lucide React icons consistently
5. Test authentication states (guest/user)

## Deployment

### Local to Production
1. Test locally with `npm run dev`
2. Build with `npm run build`
3. Commit changes: `git add . && git commit -m "Description"`
4. Push to GitHub: `git push`
5. Netlify auto-deploys from GitHub
6. Verify at https://curiosai.com

### Environment Variables
Set in Netlify dashboard under Site Settings > Environment Variables:
- All `VITE_*` variables for frontend
- `OPENAI_API_KEY` for Netlify functions
- Database and authentication credentials

## Architecture Decisions


### Why Multi-Agent Architecture
- Specialized agents for specific tasks
- Better error isolation and handling
- Scalable for adding new capabilities
- Follows Swarm framework principles

### Why Netlify Functions
- Serverless scalability
- Secure API key handling
- Integrated with frontend deployment
- Built-in CORS and routing

This WARP.md provides the essential context for productive development in the CuriosAI codebase while maintaining the sophisticated multi-agent architecture and modern web development practices.
