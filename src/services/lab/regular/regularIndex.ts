// Lab Service - Regular Tier

// Core functionality
export { generateArtifact } from '../service.ts';

// Agent exports with consistent naming
export { LabPlannerAgent as PlannerAgent } from './agents/plannerAgent.ts';
export { LabResearcherAgent as ResearcherAgent } from './agents/researcherAgent.ts';
export { LabWriterAgent as WriterAgent } from './agents/writerAgent.ts';
export { LabFormatterAgent as FormatterAgent } from './agents/formatterAgent.ts';

// Controller
export { LabController } from './agents/controller.ts';

// Types
export type {
  Artifact,
  ArtifactStep,
  PlanDetail,
  PlanResponse,
  ResearchResponse,
  WriterResponse,
  FormatterResponse,
  AgentResponse
} from './types.ts';

// Legacy compatibility
export { orchestrateArtifact } from './agents/orchestrator.ts';

// UI Components
export { default as LabsResultsPage } from './pages/LabsResults.tsx';
