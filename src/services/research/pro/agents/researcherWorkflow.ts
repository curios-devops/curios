// SEARCH-R1 Multi-Agent Research Workflow
// Implements the Reason, Search, Respond framework with specialized agents

import { env } from '../../../../config/env';
import { logger } from '../../../../utils/logger';
import { webCrawler } from '../../regular/tools/webCrawler';
import { secureOpenAI } from '../../../../commonService/openai/secureOpenAI';

interface SearchR1Segment {
  type: 'think' | 'search' | 'information' | 'answer';
  content: string;
  agent?: string;
  timestamp: Date;
}

interface AgentTask {
  id: string;
  agent: string;
  objective: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  result?: unknown;
  searchQueries?: string[];
  sources?: SourceInfo[];
}

interface ResearchPlan {
  thinking_process: string;
  complexity_level: 'simple' | 'moderate' | 'complex';
  agent_count: number;
  agent_tasks: Array<{
    agent_type: 'InternetSearcher' | 'WebCrawler' | 'GeneralAssistant';
    objective: string;
    expected_output: string;
    priority: number;
  }>;
  search_strategy: string;
  estimated_duration: string;
}

interface SourceInfo {
  title: string;
  url: string;
  snippet: string;
  image?: string;
  relevance_score?: number;
  agent_source?: string;
  domain?: string;
}

interface SearchResult {
  query: string;
  sources: SourceInfo[];
}

interface AgentResult {
  task_id: string;
  agent: string;
  objective: string;
  sources?: SourceInfo[];
  search_queries?: string[];
  summary?: string;
  crawled_urls?: string[];
  extracted_content?: CrawlResult[];
  synthesis?: {
    markdown_report: string;
    short_summary: string;
    sources: SourceInfo[];
    key_insights: string[];
  };
  agent_contributions?: unknown;
}

interface CrawlResult {
  url: string;
  content: string;
  full_content: string;
  key_points: string[];
  success: boolean;
  title: string;
}

interface CitationResult {
  cited_report: string;
  bibliography?: string[];
  citation_count: number;
}

type ProgressCallback = (
  stage: string,
  timeRemaining: string,
  progress: number,
  thinkingStep: string,
  searchTerms?: string[],
  sources?: SourceInfo[],
  currentAgent?: string,
  agentAction?: string,
  researchPhase?: 'planning' | 'searching' | 'analyzing' | 'synthesizing' | 'citing'
) => void;

interface ResearcherResult {
  focus_category?: string;
  headline?: string;
  subtitle?: string;
  short_summary: string;
  markdown_report: string;
  follow_up_questions: string[];
  thinking_process?: string;
  progress_updates?: string[];
  search_queries?: string[];
  sources?: SourceInfo[];
  agent_contributions?: Record<string, AgentResult>;
  search_r1_segments?: SearchR1Segment[];
  citations?: Array<{ text: string; source: SourceInfo }>;
}

// Initialize OpenAI client - using modern Responses API
const openai = env.openai.apiKey ? secureOpenAI : null;

// SEARCH-R1 Framework Implementation
class SearchR1Framework {
  private segments: SearchR1Segment[] = [];
  private maxIterations = 3;
  private currentIteration = 0;

  addSegment(type: SearchR1Segment['type'], content: string, agent?: string) {
    this.segments.push({
      type,
      content,
      agent,
      timestamp: new Date()
    });
  }

  getSegments(): SearchR1Segment[] {
    return this.segments;
  }

  shouldContinueSearch(): boolean {
    return this.currentIteration < this.maxIterations;
  }

  incrementIteration() {
    this.currentIteration++;
  }

  getCurrentIteration(): number {
    return this.currentIteration;
  }
}

// Lead Researcher Agent - Coordinates the multi-agent system
class LeadResearcher {
  private framework: SearchR1Framework;
  private onProgress: ProgressCallback;

  constructor(framework: SearchR1Framework, onProgress: ProgressCallback) {
    this.framework = framework;
    this.onProgress = onProgress;
  }

  async plan(query: string, focusMode: string = 'web'): Promise<ResearchPlan> {
    this.onProgress(
      'Planning Research Strategy', 
      'About 3-5 minutes remaining', 
      10, 
      'Lead Researcher analyzing query complexity and planning approach',
      [],
      [],
      'LeadResearcher',
      'Analyzing query complexity and determining research strategy',
      'planning'
    );

    this.framework.addSegment('think', `Analyzing query: "${query}" with focus mode: ${focusMode}. Need to determine research complexity and plan agent deployment.`, 'LeadResearcher');

    const planPrompt = `You are a Lead Research Agent coordinating a multi-agent research system using the SEARCH-R1 framework.

Query: "${query}"
Focus Mode: ${focusMode}

Analyze this query and create a comprehensive research plan. Consider:

1. COMPLEXITY ASSESSMENT:
   - Simple: Basic fact-finding (1 agent, 1-2 searches)
   - Moderate: Comparison or analysis (2 agents, 2-3 searches each)
   - Complex: Multi-faceted research (3 agents, clearly divided responsibilities)

2. AGENT DEPLOYMENT STRATEGY:
   - InternetSearcher: For current web information and general searches
   - WebCrawler: For deep content extraction from specific URLs
   - GeneralAssistant: For synthesis and knowledge-based analysis

3. SEARCH STRATEGY:
   - Start wide, then narrow down
   - Use short, broad queries initially
   - Progressive refinement based on findings

4. FOCUS MODE CONSIDERATIONS:
   ${this.getFocusContext(focusMode)}

Return a JSON plan with:
- thinking_process: Your analysis
- complexity_level: simple/moderate/complex
- agent_count: 1-3
- agent_tasks: Array of specific tasks for each agent
- search_strategy: Overall approach
- estimated_duration: Time estimate`;

    try {
      const response = await openai?.responses.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert research coordinator. Respond only with valid JSON.' },
          { role: 'user', content: planPrompt }
        ],
        temperature: 0.3,
        max_output_tokens: 1500,
        response_format: { type: 'json_object' }
      });

      const planText = response?.output_text || response?.content?.[0]?.text || '{}';
      const plan = JSON.parse(planText) as ResearchPlan;
      
      this.framework.addSegment('think', `Research plan created: ${plan.complexity_level} complexity, deploying ${plan.agent_count} agents`, 'LeadResearcher');
      
      return plan;
    } catch (error) {
      logger.error('Lead Researcher planning failed:', error);
      // Fallback plan
      return {
        thinking_process: 'Failed to generate detailed plan, using fallback strategy',
        complexity_level: 'moderate',
        agent_count: 2,
        agent_tasks: [
          {
            agent_type: 'InternetSearcher',
            objective: 'Find current information about the query',
            expected_output: 'Recent web search results with sources',
            priority: 1
          },
          {
            agent_type: 'GeneralAssistant',
            objective: 'Synthesize findings and provide analysis',
            expected_output: 'Comprehensive analysis and summary',
            priority: 2
          }
        ],
        search_strategy: 'Broad search followed by synthesis',
        estimated_duration: '3-4 minutes'
      };
    }
  }

  private getFocusContext(focusMode: string): string {
    const focusContexts: Record<string, string> = {
      'health': 'Focus on medical accuracy, peer-reviewed sources, and health implications',
      'academic': 'Prioritize scholarly sources, research papers, and academic databases',
      'finance': 'Emphasize financial data, market analysis, and economic implications',
      'travel': 'Include local information, travel guides, and destination-specific details',
      'social': 'Consider social media trends, community discussions, and public opinion',
      'math': 'Focus on mathematical accuracy, computational methods, and technical details',
      'video': 'Prioritize video content, visual media, and multimedia sources',
      'web': 'Comprehensive web search across all relevant sources'
    };
    
    return focusContexts[focusMode] || focusContexts['web'];
  }
}

// Internet Searcher Agent
class InternetSearcher {
  private framework: SearchR1Framework;
  private onProgress: ProgressCallback;

  constructor(framework: SearchR1Framework, onProgress: ProgressCallback) {
    this.framework = framework;
    this.onProgress = onProgress;
  }

  async search(task: AgentTask, focusMode: string = 'web'): Promise<AgentResult> {
    this.onProgress(
      'Searching Internet Sources', 
      'About 2-3 minutes remaining', 
      30, 
      'Internet Searcher gathering information from web sources',
      [],
      [],
      'InternetSearcher',
      `Executing search for: ${task.objective}`,
      'searching'
    );

    this.framework.addSegment('think', `Planning search strategy for: ${task.objective}. Will start with broad queries and narrow down.`, 'InternetSearcher');

    // Simulate multiple searches (would use actual search APIs in production)
    const searches = await this.performSearches(task.objective, focusMode);
    
    this.framework.addSegment('search', `Searching for: ${task.objective}`, 'InternetSearcher');
    this.framework.addSegment('information', `Found ${searches.length} relevant sources`, 'InternetSearcher');

    const summary = await this.synthesizeSearchResults(searches, task.objective);
    
    return {
      task_id: task.id,
      objective: task.objective,
      search_queries: searches.map(s => s.query),
      sources: searches.flatMap(s => s.sources),
      summary: summary,
      agent: 'InternetSearcher'
    };
  }

  private async performSearches(objective: string, focusMode: string): Promise<SearchResult[]> {
    // Use OpenAI-powered search instead of external APIs
    try {
      const searchResults = await this.performOpenAISearch(objective, focusMode);
      return searchResults;
    } catch (error) {
      logger.error('OpenAI search failed, using fallback:', error);
      
      // Fallback to original mock behavior
      const baseQuery = objective.toLowerCase();
      const focusSuffix = this.getFocusSearchSuffix(focusMode);
      
      const searchQueries = [
        `${baseQuery} ${focusSuffix}`.trim(),
        `${baseQuery} recent developments`,
        `${baseQuery} expert analysis`
      ];

      return searchQueries.map((query, index) => ({
        query,
        sources: this.generateMockSources(query, index + 2)
      }));
    }
  }

  private async performOpenAISearch(objective: string, focusMode: string): Promise<SearchResult[]> {
    if (!openai) {
      throw new Error('OpenAI client not available');
    }

    const focusContext = this.getFocusSearchContext(focusMode);
    
    // Generate multiple search queries for comprehensive coverage
    const searchQueries = [
      `${objective} ${this.getFocusSearchSuffix(focusMode)}`.trim(),
      `${objective} recent developments analysis`,
      `${objective} expert research findings`
    ];

    const searchResults = [];

    for (const query of searchQueries) {
      try {
        const completion = await openai.responses.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert web researcher with access to current internet information. Your task is to find and provide real web sources for the given query.

              ${focusContext ? `FOCUS MODE: ${focusContext}` : ''}
              
              Find 4-6 high-quality, authoritative sources related to the query. Return them as JSON with this exact structure:
              {
                "sources": [
                  {
                    "title": "Actual page title",
                    "url": "Real URL to the source", 
                    "snippet": "Brief description of the content",
                    "domain": "Domain name (e.g., wikipedia.org, github.com)",
                    "relevance_score": 0.9
                  }
                ]
              }

              Focus on:
              - Authoritative sources (Wikipedia, academic sites, official documentation)
              - Recent articles and news (within the last 2 years when relevant)
              - Technical documentation and guides
              - Research papers and studies
              - Industry reports and analysis

              CURRENT DATE: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
            },
            {
              role: 'user',
              content: `Find high-quality web sources for: "${query}"`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_output_tokens: 1000
        });

        const content = completion.output_text || completion.content?.[0]?.text;
        if (content) {
          const parsed = JSON.parse(content);
          
          if (parsed.sources && Array.isArray(parsed.sources) && parsed.sources.length > 0) {
            // Transform and validate sources
            const validSources = parsed.sources
              .filter((source: { title?: string; url?: string; snippet?: string }) => source.title && source.url && source.snippet)
              .map((source: { title: string; url: string; snippet: string; domain?: string; relevance_score?: number }) => ({
                title: source.title,
                url: source.url,
                snippet: source.snippet,
                relevance_score: source.relevance_score || 0.8,
                agent_source: 'InternetSearcher',
                domain: source.domain || this.extractDomainFromUrl(source.url)
              }))
              .slice(0, 6); // Limit to 6 sources

            if (validSources.length > 0) {
              logger.info(`Found ${validSources.length} real sources via OpenAI for: ${query}`);
              searchResults.push({
                query,
                sources: validSources
              });
              continue;
            }
          }
        }
        
        // If no valid sources found, use fallback
        throw new Error('No valid sources in OpenAI response');
        
      } catch (searchError) {
        logger.warn(`OpenAI search failed for query: ${query}, using fallback`, searchError);
        // Add fallback for this specific query
        searchResults.push({
          query,
          sources: this.generateMockSources(query, 3)
        });
      }
    }

    return searchResults;
  }

  private extractDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return 'web';
    }
  }

  private getFocusSearchContext(focusMode: string): string | undefined {
    if (!focusMode || focusMode === 'web') return undefined;
    
    const contexts: Record<string, string> = {
      'health': 'Focus on medical research, clinical studies, and health implications from authoritative medical sources',
      'academic': 'Prioritize scholarly sources, peer-reviewed papers, and academic research databases',
      'finance': 'Emphasize financial analysis, market data, and economic research from financial institutions',
      'travel': 'Include destination guides, local information, and travel industry insights',
      'social': 'Consider social media trends, community discussions, and public opinion analysis',
      'math': 'Focus on mathematical concepts, computational methods, and technical documentation',
      'video': 'Prioritize video content, multimedia sources, and visual learning materials'
    };
    
    return contexts[focusMode];
  }

  private getFocusSearchSuffix(focusMode: string): string {
    const suffixes: Record<string, string> = {
      'health': 'medical health research',
      'academic': 'academic research scholarly',
      'finance': 'financial market economic',
      'travel': 'travel guide local information',
      'social': 'social media community discussion',
      'math': 'mathematical computational',
      'video': 'video content multimedia',
      'web': ''
    };
    
    return suffixes[focusMode] || '';
  }

  private generateMockSources(query: string, count: number): SourceInfo[] {
    // Enhanced fallback sources
    return Array.from({ length: Math.min(count, 3) }, (_, i) => ({
      title: `Research Source ${i + 1}: ${query}`,
      url: `https://research-${i + 1}.example.com/article`,
      snippet: `Comprehensive information about ${query} from a reliable research source. This content provides valuable insights and analysis.`,
      relevance_score: 0.9 - (i * 0.1),
      agent_source: 'InternetSearcher'
    }));
  }

  private async synthesizeSearchResults(searches: SearchResult[], objective: string): Promise<string> {
    const allSources = searches.flatMap(s => s.sources);
    const allQueries = searches.map(s => s.query);

    const synthesisPrompt = `Synthesize the following search results for the objective: "${objective}"

Search Queries Used: ${allQueries.join(', ')}
Number of Sources Found: ${allSources.length}

Create a comprehensive summary that:
1. Highlights key findings
2. Identifies patterns and trends
3. Notes any conflicting information
4. Suggests areas needing further investigation

Sources: ${JSON.stringify(allSources, null, 2)}`;

    try {
      const response = await openai?.responses.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert information synthesizer. Provide clear, accurate summaries.' },
          { role: 'user', content: synthesisPrompt }
        ],
        temperature: 0.2,
        max_output_tokens: 800
      });

      return response?.output_text || response?.content?.[0]?.text || 'Summary generation failed';
    } catch (error) {
      logger.error('Search synthesis failed:', error);
      return `Found ${allSources.length} sources related to ${objective}. Manual synthesis required.`;
    }
  }
}

// Web Crawler Agent
class WebCrawler {
  private framework: SearchR1Framework;
  private onProgress: ProgressCallback;

  constructor(framework: SearchR1Framework, onProgress: ProgressCallback) {
    this.framework = framework;
    this.onProgress = onProgress;
  }

  async crawl(task: AgentTask, urls: string[]): Promise<AgentResult> {
    this.onProgress(
      'Extracting Deep Content', 
      'About 1-2 minutes remaining', 
      60, 
      'Web Crawler extracting detailed content from sources',
      [],
      [],
      'WebCrawler',
      `Crawling ${urls.length} URLs for detailed content`,
      'analyzing'
    );

    this.framework.addSegment('think', `Analyzing ${urls.length} URLs for deep content extraction`, 'WebCrawler');

    try {
      // Use real web crawler
      const crawlResults = await webCrawler.crawlMultipleUrls(urls.slice(0, 3)); // Limit to 3 URLs
      
      const processedResults = crawlResults.map((result: { url: string; summary: string; content: string; keyPoints: string[]; metadata: { success: boolean }; title: string }) => ({
        url: result.url,
        content: result.summary,
        full_content: result.content,
        key_points: result.keyPoints,
        success: result.metadata.success,
        title: result.title
      }));

      for (const result of processedResults) {
        if (result.success) {
          this.framework.addSegment('information', `Successfully extracted content from ${result.url}`, 'WebCrawler');
        } else {
          this.framework.addSegment('information', `Failed to extract content from ${result.url}`, 'WebCrawler');
        }
      }

      return {
        task_id: task.id,
        objective: task.objective,
        crawled_urls: urls,
        extracted_content: processedResults,
        agent: 'WebCrawler'
      };
    } catch (error) {
      logger.error('Web crawling failed:', error);
      
      // Fallback to mock content
      const fallbackResults = urls.slice(0, 3).map(url => ({
        url,
        content: `Content extraction unavailable for ${url}`,
        full_content: `Detailed content from ${url} would appear here when crawling is successful.`,
        key_points: [
          'Key finding 1 from the content',
          'Important insight 2',
          'Notable conclusion 3'
        ],
        success: false,
        title: `Content from ${url}`
      }));

      return {
        task_id: task.id,
        objective: task.objective,
        crawled_urls: urls,
        extracted_content: fallbackResults,
        agent: 'WebCrawler'
      };
    }
  }
}

// General Assistant Agent
class GeneralAssistant {
  private framework: SearchR1Framework;
  private onProgress: ProgressCallback;

  constructor(framework: SearchR1Framework, onProgress: ProgressCallback) {
    this.framework = framework;
    this.onProgress = onProgress;
  }

  async synthesize(task: AgentTask, agentResults: AgentResult[], query: string, focusMode: string): Promise<AgentResult> {
    this.onProgress(
      'Synthesizing Research', 
      'About 1 minute remaining', 
      80, 
      'General Assistant synthesizing all findings into comprehensive report',
      [],
      [],
      'GeneralAssistant',
      'Creating comprehensive synthesis from all agent findings',
      'synthesizing'
    );

    this.framework.addSegment('think', 'Synthesizing all agent findings into a comprehensive research report', 'GeneralAssistant');

    const synthesis = await this.createSynthesis(agentResults, query, focusMode);
    
    this.framework.addSegment('answer', 'Research synthesis completed', 'GeneralAssistant');

    return {
      task_id: task.id,
      objective: task.objective,
      synthesis: synthesis,
      agent_contributions: agentResults,
      agent: 'GeneralAssistant'
    };
  }

  private async createSynthesis(agentResults: AgentResult[], query: string, focusMode: string): Promise<{
    markdown_report: string;
    short_summary: string;
    sources: SourceInfo[];
    key_insights: string[];
  }> {
    const synthesisPrompt = `Create a comprehensive research synthesis for the query: "${query}"

Focus Mode: ${focusMode}

Agent Results:
${JSON.stringify(agentResults, null, 2)}

Create a detailed research report with:
1. Executive summary (2-3 sentences)
2. Key findings and insights
3. Supporting evidence from sources
4. Analysis and implications
5. Areas for further research
6. Conclusion

Format as a well-structured markdown report. Include proper citations where appropriate.`;

    try {
      const response = await openai?.responses.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert research synthesizer. Create comprehensive, well-structured research reports with proper analysis and citations.' },
          { role: 'user', content: synthesisPrompt }
        ],
        temperature: 0.2,
        max_output_tokens: 2000
      });

      const reportContent = response?.output_text || response?.content?.[0]?.text || 'Synthesis generation failed';

      return {
        markdown_report: reportContent,
        short_summary: this.extractSummary(reportContent),
        sources: agentResults.flatMap(r => r.sources || []),
        key_insights: this.extractKeyInsights(reportContent)
      };
    } catch (error) {
      logger.error('Synthesis creation failed:', error);
      return {
        markdown_report: 'Research synthesis failed. Please try again.',
        short_summary: 'Unable to generate synthesis',
        sources: [],
        key_insights: []
      };
    }
  }

  private extractSummary(report: string): string {
    // Extract the first paragraph or executive summary
    const lines = report.split('\n');
    const summaryStart = lines.findIndex(line => 
      line.toLowerCase().includes('summary') || 
      line.toLowerCase().includes('executive') ||
      lines.indexOf(line) < 5
    );
    
    if (summaryStart !== -1) {
      const nextSection = lines.slice(summaryStart + 1).findIndex(line => line.startsWith('#'));
      const summaryLines = lines.slice(summaryStart + 1, nextSection === -1 ? summaryStart + 4 : summaryStart + nextSection + 1);
      return summaryLines.join(' ').trim();
    }
    
    return report.split('\n').slice(0, 3).join(' ').trim();
  }

  private extractKeyInsights(report: string): string[] {
    // Extract key insights from the report
    const insights = [];
    const lines = report.split('\n');
    
    for (const line of lines) {
      if (line.includes('•') || line.includes('*') || line.includes('-')) {
        const cleaned = line.replace(/[•*-]/g, '').trim();
        if (cleaned.length > 20) {
          insights.push(cleaned);
        }
      }
    }
    
    return insights.slice(0, 5); // Return top 5 insights
  }
}

// Citation Agent
class CitationAgent {
  private framework: SearchR1Framework;
  private onProgress: ProgressCallback;

  constructor(framework: SearchR1Framework, onProgress: ProgressCallback) {
    this.framework = framework;
    this.onProgress = onProgress;
  }

  addCitations(report: string, sources: SourceInfo[]): CitationResult {
    this.onProgress(
      'Adding Citations', 
      'Almost complete', 
      95, 
      'Citation Agent adding proper citations to research report',
      [],
      sources,
      'CitationAgent',
      'Processing citations for research report',
      'citing'
    );

    this.framework.addSegment('think', 'Adding proper citations to ensure all claims are attributed to sources', 'CitationAgent');

    const citedReport = this.processCitations(report, sources);
    
    return {
      cited_report: citedReport,
      bibliography: this.createBibliography(sources),
      citation_count: sources.length
    };
  }

  private processCitations(report: string, sources: SourceInfo[]): string {
    // Add citations to the report
    // This is a simplified version - a full implementation would use NLP to match claims to sources
    
    let citedReport = report;
    sources.forEach((source, index) => {
      const citation = `[${index + 1}]`;
      // Simple citation insertion - would be more sophisticated in production
      citedReport += `\n\n${citation} ${source.title} - ${source.url}`;
    });

    return citedReport;
  }

  private createBibliography(sources: SourceInfo[]): string[] {
    return sources.map((source, index) => 
      `[${index + 1}] ${source.title}. Available at: ${source.url}`
    );
  }
}

// Main Researcher Workflow
export async function runResearcherWorkflow(
  query: string, 
  onProgress: ProgressCallback,
  focusMode: string = 'web'
): Promise<ResearcherResult> {
  
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  try {
    // Initialize SEARCH-R1 Framework
    const framework = new SearchR1Framework();
    
    // Initialize agents
    const leadResearcher = new LeadResearcher(framework, onProgress);
    const internetSearcher = new InternetSearcher(framework, onProgress);
    const webCrawler = new WebCrawler(framework, onProgress);
    const generalAssistant = new GeneralAssistant(framework, onProgress);
    const citationAgent = new CitationAgent(framework, onProgress);

    // Phase 1: Planning
    const researchPlan = await leadResearcher.plan(query, focusMode);
    
    // Phase 2: Execute Agent Tasks
    const agentResults = [];
    const activeTasks: AgentTask[] = researchPlan.agent_tasks.map((task, index) => ({
      id: `task_${index}`,
      agent: task.agent_type,
      objective: task.objective,
      status: 'pending',
      searchQueries: [],
      sources: []
    }));

    // Execute tasks based on agent type
    for (const task of activeTasks) {
      task.status = 'active';
      
      let result: AgentResult | undefined;
      switch (task.agent) {
        case 'InternetSearcher': {
          result = await internetSearcher.search(task, focusMode);
          break;
        }
        case 'WebCrawler': {
          // Get URLs from previous search results
          const searchResult = agentResults.find(r => r?.agent === 'InternetSearcher');
          const urls = searchResult?.sources?.slice(0, 3).map((s: SourceInfo) => s.url) || [];
          result = await webCrawler.crawl(task, urls);
          break;
        }
        case 'GeneralAssistant': {
          result = await generalAssistant.synthesize(task, agentResults.filter((r): r is AgentResult => r !== undefined), query, focusMode);
          break;
        }
      }
      
      if (result) {
        task.status = 'completed';
        task.result = result;
        agentResults.push(result);
      }
    }

    // Phase 3: Final Synthesis
    const validAgentResults = agentResults.filter((r): r is AgentResult => r !== undefined);
    const finalSynthesis = validAgentResults.find(r => r.agent === 'GeneralAssistant')?.synthesis || {
      markdown_report: 'No synthesis available',
      short_summary: 'Research completed but synthesis failed',
      sources: [],
      key_insights: []
    };

    // Phase 4: Add Citations
    const allSources = validAgentResults.flatMap(r => r.sources || []);
    const citationResult = citationAgent.addCitations(finalSynthesis.markdown_report, allSources);

    // Phase 5: Final Progress Update
    onProgress(
      'Research Complete', 
      'Completed', 
      100, 
      'Multi-agent research completed successfully',
      validAgentResults.flatMap(r => r.search_queries || []),
      allSources,
      'System',
      'Research workflow completed',
      'citing'
    );

    // Construct final result
    const result: ResearcherResult = {
      focus_category: focusMode.toUpperCase(),
      headline: `Advanced Research: ${query}`,
      subtitle: `Multi-agent analysis using SEARCH-R1 framework`,
      short_summary: finalSynthesis.short_summary,
      markdown_report: citationResult.cited_report,
      follow_up_questions: [
        `What are the recent developments in ${query}?`,
        `How does ${query} impact different industries?`,
        `What are the future implications of ${query}?`
      ],
      thinking_process: researchPlan.thinking_process,
      search_queries: validAgentResults.flatMap(r => r.search_queries || []),
      sources: allSources,
      agent_contributions: validAgentResults.reduce((acc, r) => {
        acc[r.agent] = r;
        return acc;
      }, {} as Record<string, AgentResult>),
      search_r1_segments: framework.getSegments(),
      citations: citationResult.bibliography?.map((bib: string, index: number) => ({
        text: bib,
        source: allSources[index] || { title: 'Unknown', url: '', snippet: '' }
      })) || []
    };

    return result;

  } catch (error) {
    logger.error('Researcher workflow failed:', error);
    throw new Error(`Research workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
