// Research-specific type definitions

export interface PlanDetail {
  step: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  result?: string;
}

export interface PlanResponse {
  plan: PlanDetail[];
  estimatedTime: number;
  totalSteps: number;
}

export interface ResearchResponse {
  query: string;
  content: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  images?: Array<{
    url: string;
    alt?: string;
    source?: string;
    width?: number;
    height?: number;
  }>;
  followUpQuestions?: string[];
  researchPlan?: PlanDetail[];
}

export interface WriterResponse {
  content: string;
  title: string;
  summary: string;
  tone: string;
  wordCount: number;
  sections?: Array<{
    heading: string;
    content: string;
    wordCount: number;
  }>;
  citations?: string[];
}

export interface FormatterResponse {
  formattedContent: string;
  formatType: 'markdown' | 'html' | 'plaintext';
  metadata: {
    wordCount: number;
    readingTime: number;
    headings: Array<{
      level: number;
      text: string;
      id: string;
    }>;
  };
}

// Type for the research data used in ResearchResults component
export interface ResearchData {
  query: string;
  content: string;
  sources: Array<{
    title: string;
    url: string;
    content?: string;
  }>;
  images?: Array<{
    url: string;
    alt?: string;
    source?: string;
    width?: number;
    height?: number;
  }>;
  followUpQuestions?: string[];
  researchPlan?: PlanDetail[];
  status?: 'pending' | 'in_progress' | 'completed' | 'error';
  error?: string;
}
