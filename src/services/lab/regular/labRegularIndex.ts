// Lab Service - Regular Tier

// Core functionality
export { generateArtifact } from '../labService.ts';

// Agent exports with consistent naming
export { LabPlannerAgent as PlannerAgent } from './agents/plannerAgent.ts';
export { LabResearcherAgent as ResearcherAgent } from './agents/researcherAgent.ts';
export { LabWriterAgent as WriterAgent } from './agents/writerAgent.ts';
export { LabFormatterAgent as FormatterAgent } from './agents/formatterAgent.ts';

// Controller
export { LabController } from './agents/labController.ts';

// Types
export { 
  type Artifact, 
  type ArtifactStep, 
  type PlanDetail, 
  type PlanResponse, 
  type ResearchResponse, 
  type WriterResponse, 
  type FormatterResponse 
} from '../../../../commonApp/types/researchTypes';

export type { AgentResponse } from '../../../../commonApp/types/types';

// Legacy compatibility
export { orchestrateArtifact } from './agents/orchestrator.ts';

// UI Components
export { default as LabsResultsPage } from './pages/LabsResults.tsx';
