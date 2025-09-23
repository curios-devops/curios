// Lab Service - Main Entry Point

// Re-export all from regular tier
export {
  // Core functionality
  generateArtifact,
  
  // Agents
  PlannerAgent,
  ResearcherAgent,
  WriterAgent,
  FormatterAgent,
  
  // Controller
  LabController,
  
  // Types
  type Artifact,
  type ArtifactStep,
  type PlanDetail,
  type PlanResponse,
  type ResearchResponse,
  type WriterResponse,
  type FormatterResponse,
  type AgentResponse,
  
  // Legacy
  orchestrateArtifact
} from './regular/regularIndex.ts';

// Pro tier exports (when implemented)
// export * from './pro/labProIndex.ts';

// Export UI components
export { default as LabsResultsPage } from './regular/pages/LabsResults.tsx';
