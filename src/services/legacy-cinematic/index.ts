/**
 * CinematicAI Service
 * Main entry point for cinematic video generation
 */

// Main orchestrator
export { CinematicOrchestrator } from './agents/CinematicOrchestrator';

// Agents
export { AnswerLLMAgent } from './agents/AnswerLLMAgent';
export { SceneDirectorAgent } from './agents/SceneDirectorAgent';
export { SceneGenerator as SoraSceneGenerator } from './agents/SoraSceneGenerator';

// Providers
export { SoraProvider } from './providers/SoraProvider';

// Composers
export { TextOverlayComposer } from './composers/TextOverlayComposer';
export { VideoStitcher } from './composers/VideoStitcher';

// Types
export * from './types';
