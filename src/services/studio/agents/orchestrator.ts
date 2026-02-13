/**
 * Studio Orchestrator Agent
 * Main entry point for Studio video generation workflow
 * Streams key ideas first, then generates script, then creates scenes
 */

import { StudioVideo, StudioOutputType, PlanDetail, StepItem } from '../types';
import { StudioWriterAgent } from './studioWriterAgent';
// Chapter-based rendering (replaces old SceneGeneratorAgent)
import { InputManager } from '../managers/InputManager';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { logger } from '../../../utils/logger';

// Initialize agents
const writerAgent = new StudioWriterAgent();
const inputManager = new InputManager();
const backgroundRenderer = new BackgroundRenderer();

/**
 * Main orchestration function for Studio video generation
 * Streams content progressively: key ideas first, then script
 */
export async function orchestrateArtifact(
  prompt: string,
  onProgress: (partial: Partial<StudioVideo>) => void,
  outputType: StudioOutputType
): Promise<StudioVideo> {
  // Initial setup
  onProgress({
    type: outputType,
    content: '',
    keyIdeas: '',
    script: '',
    planDetails: [],
    steps: [],
    thinkingLog: ['Starting video generation...'],
  });

  // Simulate planning phase
  await delay(300);
  const planDetails = generatePlan(prompt, outputType);
  onProgress({
    type: outputType,
    content: '',
    keyIdeas: '',
    script: '',
    planDetails,
    steps: [],
    thinkingLog: ['Plan created. Beginning execution...'],
  });

  // Generate steps from plan
  const steps: StepItem[] = planDetails.map((detail) => ({
    name: detail.step,
    status: 'pending',
  }));

  onProgress({
    type: outputType,
    content: '',
    keyIdeas: '',
    script: '',
    planDetails,
    steps,
  });

  // Execute steps with real content generation
  let keyIdeas = '';
  let script = '';
  let description = '';

  // Step 1: Analyze question
  await executeStep(steps, 0, onProgress, { type: outputType, content: '', keyIdeas, script, planDetails, steps });

  // Step 2: Generate key ideas (streaming)
  await executeStep(steps, 1, onProgress, { type: outputType, content: '', keyIdeas, script, planDetails, steps });
  
  // Generate all content with executeWithStreaming
  const result = await writerAgent.executeWithStreaming({
    query: prompt,
    onKeyIdeasChunk: (chunk: string, isComplete: boolean) => {
      if (!isComplete) {
        keyIdeas += chunk;
        onProgress({
          type: outputType,
          content: keyIdeas,
          keyIdeas,
          script,
          description,
          planDetails,
          steps: [...steps],
        });
      }
    },
    onScriptChunk: (chunk: string, isComplete: boolean) => {
      if (!isComplete) {
        script += chunk;
        onProgress({
          type: outputType,
          content: keyIdeas + '\n\n---\n\n' + script,
          keyIdeas,
          script,
          description,
          planDetails,
          steps: [...steps],
        });
      }
    },
    onDescriptionChunk: (chunk: string, isComplete: boolean) => {
      if (!isComplete) {
        description += chunk;
        onProgress({
          type: outputType,
          content: keyIdeas + '\n\n---\n\n' + script,
          keyIdeas,
          script,
          description,
          planDetails,
          steps: [...steps],
        });
      }
    },
  });

  // Extract results
  keyIdeas = result.keyIdeas;
  script = result.script;
  description = result.description || '';

  // Mark key ideas step as complete
  steps[1] = { ...steps[1], status: 'complete' };
  onProgress({
    type: outputType,
    content: keyIdeas,
    keyIdeas,
    script,
    description,
    planDetails,
    steps: [...steps],
  });

  // Mark script step as complete
  steps[2] = { ...steps[2], status: 'complete' };
  onProgress({
    type: outputType,
    content: keyIdeas + '\n\n---\n\n' + script,
    keyIdeas,
    script,
    description,
    planDetails,
    steps: [...steps],
  });

  // Step 4: Parse script into ChapterPlan
  await executeStep(steps, 3, onProgress, { type: outputType, content: keyIdeas + '\n\n---\n\n' + script, keyIdeas, script, description, planDetails, steps });
  
  // Generate unique video ID
  const videoId = generateId();
  
  // Parse script into ChapterPlan (native format for chapter-based rendering)
  const chapterPlan = writerAgent.parseScriptToChapterPlan(
    script,
    videoId,
    prompt,
    30 // Default 30 seconds
  );
  
  logger.info('[Orchestrator] ChapterPlan created', {
    videoId,
    chapterCount: chapterPlan.chapters.length
  });
  
  steps[3] = { ...steps[3], status: 'complete' };
  onProgress({
    type: outputType,
    content: keyIdeas + '\n\n---\n\n' + script,
    keyIdeas,
    script,
    description,
    chapterPlan, // NEW: Store ChapterPlan instead of SceneStructure
    planDetails,
    steps: [...steps],
  });

  // Map output type to format
  const format = outputType === 'video' ? 'horizontal' : 'vertical';

  // Step 5: Prepare chapter assets (images, audio, timeline)
  await executeStep(steps, 4, onProgress, { type: outputType, content: keyIdeas + '\n\n---\n\n' + script, keyIdeas, script, description, chapterPlan, planDetails, steps });
  
  logger.info('[Orchestrator] Preparing chapter assets...');
  
  try {
    // InputManager prepares all chapters with assets
    const chapterDescriptors = await inputManager.prepareChapters(chapterPlan);
    
    logger.info('[Orchestrator] Chapter assets prepared', {
      descriptorCount: chapterDescriptors.length
    });
    
    steps[4] = { ...steps[4], status: 'complete' };
    onProgress({
      type: outputType,
      content: keyIdeas + '\n\n---\n\n' + script,
      keyIdeas,
      script,
      description,
      chapterPlan,
      planDetails,
      steps: [...steps],
    });

    // Step 6: Generate audio (handled by InputManager, but could add real TTS here)
    await executeStep(steps, 5, onProgress, { type: outputType, content: keyIdeas + '\n\n---\n\n' + script, keyIdeas, script, description, chapterPlan, planDetails, steps });
    
    // TODO: Call OpenAI TTS API here to replace mock audio
    logger.info('[Orchestrator] Audio generation (using mock for now)');
    
    steps[5] = { ...steps[5], status: 'complete' };
    onProgress({
      type: outputType,
      content: keyIdeas + '\n\n---\n\n' + script,
      keyIdeas,
      script,
      description,
      chapterPlan,
      planDetails,
      steps: [...steps],
    });

    // Step 7: Render video (background rendering)
    await executeStep(steps, 6, onProgress, { type: outputType, content: keyIdeas + '\n\n---\n\n' + script, keyIdeas, script, description, chapterPlan, planDetails, steps });
    
    logger.info('[Orchestrator] Starting chapter-based video rendering...');
    
    // Get current user ID (TODO: integrate with auth)
    const userId = null; // Will be set when auth is integrated
    
    // Start background rendering
    const chapterUrls = await backgroundRenderer.startBackgroundRendering(
      chapterDescriptors,
      videoId,
      userId,
      (chapterIndex: number, url: string) => {
        logger.info('[Orchestrator] Chapter rendered', { chapterIndex, url: url.substring(0, 50) });
      },
      (progress: number) => {
        logger.info('[Orchestrator] Overall rendering progress', { progress });
      }
    );
    
    // Get first chapter URL (background rendering continues for rest)
    const firstChapterUrl = chapterUrls.get(chapterDescriptors[0].id);
    
    logger.info('[Orchestrator] First chapter ready', {
      videoId,
      firstChapterUrl: firstChapterUrl?.substring(0, 50),
      totalChapters: chapterDescriptors.length
    });
    
    steps[6] = { ...steps[6], status: 'complete' };

    const finalVideo: StudioVideo = {
      id: videoId,
      type: outputType,
      content: keyIdeas + '\n\n---\n\n' + script,
      keyIdeas,
      script,
      description,
      chapterPlan, // NEW: Store ChapterPlan
      videoUrl: firstChapterUrl || '', // First chapter URL
      title: prompt,
      planDetails,
      steps,
      thinkingLog: ['Generation complete!'],
      createdAt: new Date(),
      duration: chapterPlan.totalDuration,
      format,
    };

    onProgress(finalVideo);
    return finalVideo;
    
  } catch (error) {
    logger.error('[Orchestrator] Chapter rendering failed', { error });
    
    // Return error state
    steps[6] = { ...steps[6], status: 'complete' };
    const errorVideo: StudioVideo = {
      id: videoId,
      type: outputType,
      content: keyIdeas + '\n\n---\n\n' + script,
      keyIdeas,
      script,
      description,
      chapterPlan,
      videoUrl: '',
      title: prompt,
      planDetails,
      steps,
      thinkingLog: ['Rendering failed. Please try again.'],
      createdAt: new Date(),
      duration: 30,
      format,
    };
    
    onProgress(errorVideo);
    return errorVideo;
  }
}

/**
 * Execute a single step
 */
async function executeStep(
  steps: StepItem[],
  index: number,
  onProgress: (partial: Partial<StudioVideo>) => void,
  currentState: Partial<StudioVideo>
) {
  await delay(500);
  
  steps[index] = {
    ...steps[index],
    status: 'in_progress',
    agentStatus: 'working',
    agentName: 'Studio Agent',
    thinkingSince: Date.now(),
  };

  onProgress({
    ...currentState,
    steps: [...steps],
    thinkingLog: [`Executing: ${steps[index].name}`],
  });

  await delay(800);
}

/**
 * Generate a plan based on the prompt and output type
 */
function generatePlan(prompt: string, outputType: StudioOutputType): PlanDetail[] {
  const basePlan: PlanDetail[] = [
    {
      step: 'Analyze question',
      detail: `Understanding the curiosity: "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
    },
    {
      step: 'Generate key ideas',
      detail: 'Extracting 3-5 key bullet points for the video',
    },
    {
      step: 'Create script',
      detail: `Writing ${outputType} script with chaptered structure`,
    },
    {
      step: 'Parse into chapters',
      detail: 'Converting script into ChapterPlan for rendering',
    },
    {
      step: 'Prepare assets',
      detail: 'Searching images (Brave API) and preparing audio (TTS)',
    },
    {
      step: 'Generate voiceover',
      detail: 'Creating AI narration with text-to-speech (OpenAI TTS)',
    },
    {
      step: 'Render chapters',
      detail: 'Rendering chapters with Canvas + MediaRecorder (client-side)',
    },
  ];

  return basePlan;
}

/**
 * Simple delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  // Generate UUID v4 compatible ID for Supabase videos table
  return crypto.randomUUID();
}
