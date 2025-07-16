export interface Artifact {
  id: string;
  title: string;
  type: string; // allow all types
  content: string;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  steps: ArtifactStep[];
  imageUrl?: string; // For DALL·E images
  gameCode?: string; // For game React code
  thinkingLog?: string[]; // Agent process log
  planDetails?: { step: string, detail: string }[]; // LLM-generated plan for UI
}

export interface Citation {
  url: string;
  title?: string;
  start_index?: number;
  end_index?: number;
}

export interface ArtifactStep {
  name: string;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  result?: string;
  citations?: Citation[];
  agentName?: string; // e.g., 'Manus', 'Researcher'
  agentStatus?: string; // e.g., 'is working', 'Thinking', etc.
  thinkingSince?: number; // timestamp (ms) when agent started working
} 