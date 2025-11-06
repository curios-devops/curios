# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Start Development Environment
```bash
npm run dev              # Start Vite dev server on port 5173
npm run dev:full         # Start both Supabase (local) and Vite concurrently
npm run dev:supabase     # Start only Supabase local server
npm run dev:stop         # Stop Supabase local server
```

### Build and Quality
```bash
npm run build            # Build for production (TypeScript + Vite)
npm run lint             # Run ESLint checks
npm run preview          # Preview production build
```

### Important Notes
- **Always use `npm run dev` during development**, never `npm run build` in interactive sessions (breaks HMR)
- Vite runs on port 5173 (do not use other ports)
- For full local stack testing, use `npm run dev:full` to start both Supabase and Vite

## High-Level Architecture

### Core Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (Auth, Storage, Database) + Supabase Edge Functions (Deno)
- **Deployment**: Netlify (frontend), Supabase (backend services)
- **AI Integration**: OpenAI API routed through Supabase Edge Functions

### Multi-Agent Search System
CuriosAI implements a **multi-agent architecture** inspired by Swarm, Stanford Storm, and MindSearch, featuring three distinct search modes:

#### Search Modes Architecture

**1. Regular Search** (`/search` → `SearchResults`)
- **Flow**: User Query → Retriever → Writer → Results
- **Agents**: `SearchRetrieverAgent` + `SearchWriterAgent`
- **Location**: `src/services/search/regular/`
- **Features**: Simple, fast searches using Brave/Tavily/SearXNG

**2. Pro Search** (`/pro-search` → `ProSearchResults`)
- **Flow**: User Query → SwarmController → Perspective Generator → Retriever → Writer → Results
- **Agents**: `SwarmController` (includes `PerspectiveAgent`) + Retriever + Writer
- **Location**: `src/services/search/pro/`
- **Features**: Multi-perspective analysis, parallel subtask searches, comprehensive coverage

**3. Research Modes**
- **Insights** (`/insights-results`) - Regular tier research workflow
- **Research** (`/research-results?pro=true`) - Pro tier deep research
- **Location**: `src/services/research/`

**4. Labs** (Experimental)
- **Labs** (`/labs-results`) - Regular experimental features
- **Pro Labs** (`/pro-labs-results?pro=true`) - Pro experimental features
- **Location**: `src/services/lab/`

### Service Separation Pattern
Services are **completely separated** to prevent cross-contamination:
- `src/services/search/regular/` - NO Pro features, NO SwarmController, NO Perspectives
- `src/services/search/pro/` - Full Pro features with SwarmController
- `src/services/search/searchService.ts` - Unified router based on `isPro` flag

### Common Infrastructure

**Agents** (`src/commonService/agents/`)
- `baseAgent.ts` - Base agent class for all AI agents

**Search Tools** (`src/commonService/searchTools/`)
- `braveSearchTool.ts` - Primary search (Brave Search API)
- `tavily.ts` / `tavilyService.ts` - Tavily search integration
- `searxng.ts` / `searxService.ts` - SearXNG fallback
- `apifySearchTool.ts` - Apify-based search
- `bingReverseImageSearchTool.ts` - Reverse image search
- `googleReverseImageSearchTool.ts` - Google reverse image search

**Utils** (`src/commonService/utils/`)
- `constants.ts` - Application constants
- `types.ts` - Shared TypeScript types

### Supabase Edge Functions
Located in `supabase/functions/`:
- `brave-search/` - Brave search wrapper
- `brave-web-search/` - Web-specific Brave search
- `brave-images-search/` - Image-specific Brave search
- `fetch-openai/` - Secure OpenAI API proxy
- `reverse-image-search/` - Reverse image search orchestration
- `serp-reverse-image/` - SERP API reverse image search
- `bing-reverse-image-search/` - Bing reverse image search
- `check-subscription/` - User subscription validation
- `create-checkout/` - Stripe checkout session
- `stripe-webhook/` - Stripe webhook handler

### User Tiers
- **Guest** - Unregistered visitors (limited: 3 images max)
- **Standard** (Free) - Logged-in free tier users
- **Premium** (Pro/Paid) - Subscribed users with Pro features

## Key Technical Patterns

### Environment Variables
Required in `.env`:
```bash
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Supabase anonymous key
VITE_APIFY_API_KEY=          # For reverse image search (SERP API)
OPENAI_API_KEY=              # For Supabase Edge Functions
```

### Supabase Storage
- Bucket: `reverse-image-searches` (must be **public** for SERP API access)
- Used for: Uploading images for reverse image search
- Access: Guest users (3 images), Authenticated users (5 images)

### OpenAI Integration Pattern
**Secure flow to prevent key exposure:**
```
Frontend → secureOpenAI.ts → Supabase Edge Function (fetch-openai) → OpenAI API
```
Never expose OpenAI API keys in frontend code.

### Image Search Features
- **Text-only**: Standard Brave/Tavily search
- **Image-only**: Uploads to Supabase Storage → Reverse image search via SERP API
- **Combined (text + image)**: Parallel execution of both, merged results with deduplication
- Search button **enables** when images present (even without text query)

### Agent Communication Pattern
Agents use **tool calling** pattern:
1. Agent receives task + available tools
2. Agent executes tool calls (search APIs)
3. Tool results returned to agent
4. Agent synthesizes final response

### Code Organization
```
src/
├── services/           # Domain-specific services
│   ├── search/        # Search modes (regular/pro)
│   ├── research/      # Research modes (insights/research)
│   └── lab/           # Experimental features
├── commonService/     # Shared agent infrastructure
│   ├── agents/       # Base agent classes
│   ├── searchTools/  # Search API integrations
│   └── utils/        # Shared utilities
├── components/       # React components
├── pages/           # Page components
├── hooks/           # React hooks
└── config/          # Configuration files
```

## Development Guidelines

### TypeScript
- Prefer `.tsx`/`.ts` for all new code
- Strict type checking enabled
- Co-locate component-specific types

### Testing Reverse Image Search
See `TESTING_GUIDE.md` for comprehensive test scenarios:
1. Text-only search (verify no regression)
2. Image-only search (upload → search)
3. Combined text+image search (merged results)
4. Guest user limits (3 images max)
5. Error handling (invalid files, oversized images, network failures)

### Hot Module Replacement (HMR)
- **Do not run** `npm run build` during development
- Always use `npm run dev`
- If HMR breaks, restart dev server

### Common Debugging
```bash
# Check TypeScript errors
npx tsc --noEmit

# Search for specific patterns
grep -r "pattern" src/

# View Supabase logs (when running locally)
supabase logs
```

### Vite Build Configuration
The `vite.config.ts` includes aggressive code-splitting to keep chunks under 500KB:
- Vendor chunks: Separate React, UI libraries, OpenAI, Supabase, Stripe
- Service chunks: Search, Research, Lab services isolated
- Component chunks: Heavy components bundled separately
- Tool chunks: Search tools in separate chunk to prevent circular dependencies

## Design System

### Color Palette
- **Dark blue** (techy evolution of hyperlink blue)
- **Turquoise/Sea-blue** (lighter for creativity, darker for professionalism)
- **Warm earthy hues** with darker blue tones for sophistication

### Typography
- **Primary**: FK Display (wordmark)
- **Secondary**: FK Grotesk (most applications)
- **Fallback/Body**: Inter, Montserrat Bold for branding

### Design Approach
- **Sophisticated-minimalist** aesthetic
- Clean dark interfaces with subtle gradients
- Geometric patterns with Art Deco influence
- Focus on whitespace and typography
- Rounded corners on interactive elements, sharp angles in decorative patterns

### Branding
- **Logo**: Compass icon symbolizing AI-guided exploration
- **Style**: Minimalist with thoughtful details
- **Inspiration**: Vintage tech aesthetics (80s/90s Apple ads)

## Important Files
- `README.md` - Detailed project overview and agent architecture
- `TESTING_GUIDE.md` - Comprehensive testing procedures for reverse image search
- `DEVELOPMENT_SETUP.md` - Development environment setup
- `docs/guides/AGENTS.md` - Agent architecture guidelines (NOTE: references Next.js but project uses Vite)
- `vite.config.ts` - Build configuration with code-splitting strategy
- `supabase/config.toml` - Supabase local development config

## Common Pitfalls
1. **Don't mix search modes**: Regular and Pro search are completely separated
2. **Public bucket required**: `reverse-image-searches` must be public for SERP API
3. **Port conflicts**: Vite must use port 5173 (strictPort: true)
4. **API key exposure**: Always route OpenAI calls through Supabase Edge Functions
5. **Build vs Dev**: Never run `npm run build` during active development
6. **Agent isolation**: Each agent type has specific responsibilities; don't cross boundaries
