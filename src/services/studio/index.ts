/**
 * Studio Service - Main Entry Point
 * 
 * Studio transforms curiosity-driven questions into short, shareable video explainers.
 * This is a new service independent from the old Labs functionality.
 */

export { orchestrateArtifact } from './agents/orchestrator';
export { STUDIO_CONFIG } from './config';
export type { 
  StudioVideo, 
  StudioOutputType, 
  StudioCategory,
  PlanDetail,
  StepItem,
} from './types';
export { STUDIO_CATEGORIES } from './types';

