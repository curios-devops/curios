# Researcher Feature - SEARCH-R1 Multi-Agent Framework

## Overview

The **Researcher** feature implements an advanced multi-agent research system using the SEARCH-R1 framework (Reason, Search, Respond). This system provides more comprehensive and deeper analysis compared to the standard Insights feature.

## Key Features

### 🧠 SEARCH-R1 Framework
- **Think**: AI reasoning and planning segments
- **Search**: Iterative web searches with real-time results
- **Information**: Processing and analyzing found content  
- **Answer**: Comprehensive synthesis and citation

### 🤖 Multi-Agent Architecture
- **LeadResearcher**: Coordinates the research strategy and manages other agents
- **InternetSearcher**: Performs focused web searches using multiple search engines
- **WebCrawler**: Extracts detailed content from specific URLs  
- **GeneralAssistant**: Synthesizes findings into comprehensive reports
- **CitationAgent**: Adds proper citations and creates bibliography

### 🔍 Advanced Search Capabilities
- Real integration with Tavily and RapidAPI search services
- Focus-mode aware search strategies (health, academic, finance, etc.)
- Parallel search execution for faster results
- Intelligent source prioritization

### 📖 Content Extraction
- Automated web crawling and content extraction
- Smart domain prioritization (Wikipedia, academic sites, etc.)
- Key point extraction and summarization
- Adaptive timeouts based on source reliability

## How It Works

### 1. Research Planning Phase
```
User Query → LeadResearcher analyzes complexity → Creates research plan
```
- Determines research complexity (simple/moderate/complex)
- Plans agent deployment strategy (1-3 agents)
- Defines search strategies based on focus mode

### 2. Multi-Agent Execution
```
LeadResearcher → Spawns specialized agents → Parallel execution
```
- **InternetSearcher**: Performs 2-3 focused searches per objective
- **WebCrawler**: Extracts detailed content from top sources
- **GeneralAssistant**: Synthesizes all findings

### 3. Iterative Research Process
```
Think → Search → Information → (Iterate if needed) → Answer
```
- Up to 3 iterations to ensure comprehensive coverage
- Real-time progress updates with agent status
- Dynamic strategy adjustment based on findings

### 4. Citation and Finalization
```
Research Complete → CitationAgent → Adds citations → Final report
```
- Proper source attribution
- Bibliography generation
- Citation count tracking

## Focus Modes

The system adapts its search strategy based on the selected focus mode:

| Focus Mode | Search Strategy | Example Queries |
|------------|----------------|-----------------|
| **Health** | Medical research, clinical studies | `query + medical research studies` |
| **Academic** | Scholarly sources, peer-reviewed papers | `query + academic research papers` |
| **Finance** | Market analysis, economic data | `query + financial analysis market` |
| **Travel** | Local information, guides | `query + travel guide information` |
| **Social** | Community discussions, opinions | `query + social media discussions` |
| **Math** | Computational methods, analysis | `query + mathematical analysis` |
| **Video** | Multimedia content, tutorials | `query + video content tutorials` |
| **Web** | Comprehensive web sources | General search across all sources |

## Technical Implementation

### File Structure
```
src/
├── pages/ResearcherResults.tsx          # Main Researcher page
├── services/agents/
│   ├── researcherWorkflow.ts           # Main SEARCH-R1 workflow
│   ├── searchTools.ts                  # Real search integrations
│   └── webCrawler.ts                   # Content extraction
└── components/ResearcherProgress.tsx    # Enhanced progress display
```

### Key Technologies
- **OpenAI GPT-4o**: For reasoning, planning, and synthesis
- **Tavily API**: Primary search service integration
- **RapidAPI/SearXNG**: Fallback search service
- **Custom Web Crawler**: Content extraction and summarization
- **React 18**: Frontend with real-time updates

### Search Integrations
```typescript
// Real search with fallback
const searchResults = await performFocusedResearch(query, focusMode);

// Parallel execution
const agentResults = await Promise.all([
  internetSearcher.search(task1),
  webCrawler.crawl(task2, urls),
  generalAssistant.synthesize(task3, results)
]);
```

## Usage

### Accessing Researcher
1. Navigate to the home page
2. Select the **"Researcher"** tab (🧠 icon)
3. Choose a focus mode (optional)
4. Enter your research query
5. Click search

### Progress Tracking
The interface provides real-time updates showing:
- Current research phase (Planning/Searching/Analyzing/Synthesizing/Citing)
- Active agent and their current task
- Search queries being executed
- Sources being analyzed
- Agent team status overview

### Results
The final report includes:
- Executive summary
- Detailed markdown report with analysis
- Properly cited sources
- Key insights and findings
- Follow-up questions for further research

## Configuration

### Environment Variables
```env
VITE_OPENAI_API_KEY=your_openai_key
VITE_TAVILY_API_KEY=your_tavily_key
VITE_RAPIDAPI_KEY=your_rapidapi_key
```

### Customization
- Adjust search iteration limits in `SearchR1Framework`
- Modify agent prompts for different research styles
- Configure crawling timeouts in `webCrawler.ts`
- Customize focus mode strategies in `searchTools.ts`

## Comparison with Insights

| Feature | Insights | Researcher |
|---------|----------|------------|
| **Framework** | Multi-agent workflow | SEARCH-R1 with iterative reasoning |
| **Agents** | 3 agents (Planner, Search, Writer) | 5 agents (Lead, Search, Crawler, Assistant, Citation) |
| **Search Depth** | 1-2 search iterations | Up to 3 iterations with refinement |
| **Content Extraction** | Basic source parsing | Deep web crawling with content analysis |
| **Reasoning** | Linear planning → execution | Iterative think → search → analyze cycles |
| **Citations** | Basic source links | Formal citations with bibliography |
| **Time** | ~2 minutes | ~3-5 minutes |
| **Complexity** | Good for quick research | Designed for comprehensive analysis |

## Performance Considerations

### Rate Limiting
- 1-second delay between search requests
- Maximum 3 parallel searches
- Adaptive timeouts based on source priority

### Caching
- Search results cached for session
- Crawl results stored temporarily
- Agent responses cached to prevent redundant calls

### Error Handling
- Graceful fallback when search APIs fail
- Mock results for development/testing
- Comprehensive error logging and user feedback

## Future Enhancements

### Planned Features
- **PDF Document Processing**: Direct PDF content extraction
- **Academic Database Integration**: PubMed, ArXiv, IEEE Xplore
- **Image Analysis**: OCR and image content understanding
- **Collaborative Research**: Multi-user research sessions
- **Research Templates**: Pre-configured research workflows

### Advanced Capabilities
- **Fact Checking**: Cross-reference claims across sources
- **Bias Detection**: Identify potential source bias
- **Timeline Generation**: Chronological analysis of topics
- **Data Visualization**: Automatic chart/graph generation
- **Export Options**: PDF, Word, LaTeX output formats

## Troubleshooting

### Common Issues
1. **No search results**: Check API key configuration
2. **Slow performance**: Verify network connectivity and API limits
3. **Incomplete crawling**: Some sites may block automated access
4. **Citation errors**: Fallback to manual citation format

### Debug Mode
Enable detailed logging by setting:
```env
VITE_LOG_LEVEL=debug
```

## Contributing

When extending the Researcher feature:
1. Follow the existing agent pattern in `researcherWorkflow.ts`
2. Add new search tools to `searchTools.ts`
3. Update progress tracking in `ResearcherProgress.tsx`
4. Test with various focus modes and query types
5. Ensure proper error handling and fallbacks

The Researcher feature represents a significant advancement in AI-powered research capabilities, providing users with comprehensive, well-sourced, and properly cited research reports through an intelligent multi-agent system.
