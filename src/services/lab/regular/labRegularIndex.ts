// Lab Service - Regular Tier

// Core functionality
export { generateArtifact } from '../labService.ts';

// Agent exports with consistent naming
export { LabPlannerAgent as PlannerAgent } from './agents/labPlannerAgent.ts';
export { LabResearcherAgent as ResearcherAgent } from './agents/labResearcherAgent.ts';
export { LabWriterAgent as WriterAgent } from './agents/labWriterAgent.ts';
export { LabFormatterAgent as FormatterAgent } from './agents/labFormatterAgent.ts';

// Controller
export { LabController } from './agents/labController.ts';

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
export { orchestrateArtifact } from './agents/labOrchestrator.ts';

// UI Components
export { default as LabsResultsPage } from './pages/LabsResults.tsx';
