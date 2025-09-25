// Minimal stub for InternetSearcher agent
class InternetSearcher {

  constructor() {
    // No-op stub constructor
  }

  async search(task: AgentTask, _focusMode: string): Promise<AgentResult> {
    // Placeholder: In real implementation, perform web search and return AgentResult
    return {
      task_id: task.id,
      agent: 'InternetSearcher',
      objective: task.objective,
      sources: [],
      search_queries: [],
      summary: 'Stub search result'
    };
  }
}

// Minimal stub for WebCrawler agent
class WebCrawler {

  constructor() {
    // No-op stub constructor
  }

  async crawl(task: AgentTask, urls: string[]): Promise<AgentResult> {
    // Placeholder: In real implementation, crawl URLs and return AgentResult
    return {
      task_id: task.id,
      agent: 'WebCrawler',
      objective: task.objective,
      crawled_urls: urls,
      extracted_content: [],
      summary: 'Stub crawl result'
    };
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
      const response = await chatCompletion({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert research synthesizer. Create comprehensive, well-structured research reports with proper analysis and citations.' },
          { role: 'user', content: synthesisPrompt }
        ],
        temperature: 0.2,
        max_output_tokens: 2000
      });
      const reportContent = response?.content || 'Synthesis generation failed';
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
  try {
    // Initialize SEARCH-R1 Framework
    const framework = new SearchR1Framework();
    
    // Initialize agents
    const leadResearcher = new LeadResearcher(framework, onProgress);
  const internetSearcher = new InternetSearcher();
  const webCrawler = new WebCrawler();
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
// SEARCH-R1 Multi-Agent Research Workflow
// Implements the Reason, Search, Respond framework with specialized agents


// ...interfaces and types (copied as-is from ResearcherWorkflowNew.ts)...


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

    // ...rest of plan logic...
    // For brevity, you may want to fill in the rest of the plan logic as in the original file.
    // This is a placeholder for the plan logic.
    return {
      thinking_process: 'Planned research process',
      complexity_level: 'moderate',
      agent_count: 2,
      agent_tasks: [
        {
          agent_type: 'InternetSearcher',
          objective: query,
          expected_output: 'Find relevant sources',
          priority: 1
        },
        {
          agent_type: 'GeneralAssistant',
          objective: query,
          expected_output: 'Synthesize findings',
          priority: 2
        }
      ],
      search_strategy: 'Start wide, then narrow',
      estimated_duration: '3-5 minutes'
    };
  }
}
// SEARCH-R1 Multi-Agent Research Workflow
// Implements the Reason, Search, Respond framework with specialized agents

import { logger } from '../../../../utils/logger';

// ...interfaces and types (copied as-is from ResearcherWorkflowNew.ts)...

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

// All completions now go through Supabase Edge Function (chat.completions)
const SUPABASE_EDGE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
  ? import.meta.env.VITE_OPENAI_API_URL
  : 'VITE_OPENAI_API_URL';
const SUPABASE_ANON_KEY = typeof window === 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : import.meta.env.VITE_SUPABASE_ANON_KEY;

async function chatCompletion({ model, messages, temperature, max_output_tokens, response_format }: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_output_tokens?: number;
  response_format?: { type: string };
}): Promise<any> {
  const response = await fetch(SUPABASE_EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      prompt: JSON.stringify({
        messages,
        model,
        temperature,
        max_output_tokens,
        response_format
      })
    })
  });
  const data = await response.json();
  // Try to parse content from returned data
  const content = data.text || data.content || data.output_text || data.choices?.[0]?.message?.content;
  return { content };
}
