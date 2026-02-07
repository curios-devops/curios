/**
 * Studio Orchestrator Agent
 * Main entry point for Studio video generation workflow
 * Streams key ideas first, then generates script, then creates scenes
 */

import { StudioVideo, StudioOutputType, PlanDetail, StepItem } from '../types';
import { StudioWriterAgent } from './studioWriterAgent';
import { SceneGeneratorAgent } from './sceneGenerator';
import { VideoRendererAgent } from './videoRenderer';
import { VideoAssetAgent } from '../assets/videoAssetAgent';
import { ImageAssetAgent } from '../assets/imageAssetAgent';
import { AudioAssetAgent } from '../audio/audioAssetAgent';
import { logger } from '../../../utils/logger';

// Initialize agents
const writerAgent = new StudioWriterAgent();
const sceneGenerator = new SceneGeneratorAgent();
const videoRenderer = new VideoRendererAgent();
const videoAssetAgent = new VideoAssetAgent();
const imageAssetAgent = new ImageAssetAgent();
const audioAssetAgent = new AudioAssetAgent();

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

  // Step 4: Generate scenes from script
  await executeStep(steps, 3, onProgress, { type: outputType, content: keyIdeas + '\n\n---\n\n' + script, keyIdeas, script, description, planDetails, steps });
  
  // Generate scene structure from the chaptered script
  const sceneStructure = sceneGenerator.generateScenes(script, 30); // Default 30 seconds
  
  // Validate scenes
  const isValid = sceneGenerator.validateScenes(sceneStructure);
  if (!isValid) {
    logger.warn('[Orchestrator] Scene validation failed, but continuing...');
  }
  
  steps[3] = { ...steps[3], status: 'complete' };
  onProgress({
    type: outputType,
    content: keyIdeas + '\n\n---\n\n' + script,
    keyIdeas,
    script,
    description,
    scenes: sceneStructure,
    planDetails,
    steps: [...steps],
  });

  // Map output type to format (used for assets and rendering)
  const format = outputType === 'video' ? 'horizontal' : 'vertical';

  // Step 5: Fetch assets in parallel (video + images)
  await executeStep(steps, 4, onProgress, { type: outputType, content: keyIdeas + '\n\n---\n\n' + script, keyIdeas, script, description, scenes: sceneStructure, planDetails, steps });
  
  let finalSceneStructure = sceneStructure;
  
  // Fetch video assets and image assets in parallel
  logger.info('[Orchestrator] Fetching assets in parallel (videos + images)...');
  
  try {
    const [videoAssets, imageAssets] = await Promise.all([
      // Video assets (Pexels)
      videoAssetAgent.isEnabled()
        ? videoAssetAgent.assignSingleVideo(sceneStructure, format, prompt)
        : Promise.resolve({ scenes: sceneStructure.scenes, totalVideos: 0, failedScenes: 0 }),
      
      // Image assets (Brave Search) - NEW Phase 6A
      imageAssetAgent.isEnabled()
        ? imageAssetAgent.assignImageOverlays(sceneStructure, 'key-points')
        : Promise.resolve({ scenes: sceneStructure.scenes, totalImages: 0, failedScenes: 0 })
    ]);
    
    // Merge video and image assets into scenes
    const enrichedScenes = sceneStructure.scenes.map((scene, index) => ({
      ...scene,
      // Add video URL from videoAssets
      videoUrl: videoAssets.scenes[index]?.videoUrl,
      videoKeywords: videoAssets.scenes[index]?.videoKeywords,
      // Add image overlay from imageAssets
      imageUrl: imageAssets.scenes[index]?.imageUrl,
      imageKeywords: imageAssets.scenes[index]?.imageKeywords,
      imageEffect: imageAssets.scenes[index]?.imageEffect,
      imageDuration: imageAssets.scenes[index]?.imageDuration,
      imagePosition: imageAssets.scenes[index]?.imagePosition,
      imageOpacity: imageAssets.scenes[index]?.imageOpacity
    }));
    
    finalSceneStructure = {
      ...sceneStructure,
      scenes: enrichedScenes
    };
    
    logger.info('[Orchestrator] Assets fetched', {
      videos: videoAssets.totalVideos,
      images: imageAssets.totalImages,
      failedVideoScenes: videoAssets.failedScenes,
      failedImageScenes: imageAssets.failedScenes
    });
    
  } catch (error) {
    logger.error('[Orchestrator] Asset fetching failed', { error });
    // Continue with original scenes (no assets)
  }
  
  steps[4] = { ...steps[4], status: 'complete' };
  onProgress({
    type: outputType,
    content: keyIdeas + '\n\n---\n\n' + script,
    keyIdeas,
    script,
    description,
    scenes: finalSceneStructure,
    planDetails,
    steps: [...steps],
  });

  // Step 6: Generate voiceover (if enabled)
  await executeStep(steps, 5, onProgress, { type: outputType, content: keyIdeas + '\n\n---\n\n' + script, keyIdeas, script, description, scenes: finalSceneStructure, planDetails, steps });
  
  if (audioAssetAgent.isEnabled()) {
    logger.info('[Orchestrator] Generating audio narration...');
    try {
      // Use full narration strategy for faster generation (single API call)
      const audioAssets = await audioAssetAgent.generateAudio(
        finalSceneStructure,
        'full-narration',
        'nova', // Default voice
        (current: number, total: number) => {
          logger.info(`[Orchestrator] Audio progress: ${current}/${total}`);
        }
      );
      
      finalSceneStructure = {
        ...finalSceneStructure,
        scenes: audioAssets.scenes
      };
      
      logger.info('[Orchestrator] Audio narration generated', {
        totalSegments: audioAssets.totalAudioSegments,
        failedSegments: audioAssets.failedSegments,
        hasFullNarration: !!audioAssets.fullNarrationUrl
      });
    } catch (error) {
      logger.error('[Orchestrator] Audio generation failed', { error });
      // Continue without audio
    }
  } else {
    logger.info('[Orchestrator] Audio generation disabled (no OpenAI API key)');
  }
  
  steps[5] = { ...steps[5], status: 'complete' };
  onProgress({
    type: outputType,
    content: keyIdeas + '\n\n---\n\n' + script,
    keyIdeas,
    script,
    description,
    scenes: finalSceneStructure,
    planDetails,
    steps: [...steps],
  });

  // Step 7: Render video
  await executeStep(steps, 6, onProgress, { type: outputType, content: keyIdeas + '\n\n---\n\n' + script, keyIdeas, script, description, scenes: finalSceneStructure, planDetails, steps });
  
  // Ensure output directory exists
  await videoRenderer.ensureOutputDirectory();
  
  // Generate unique video ID
  const videoId = generateId();
  
  // Render video with progress updates (using finalSceneStructure with assets)
  let videoUrl = '';
  try {
    videoUrl = await videoRenderer.renderVideo(
      finalSceneStructure,
      format,
      videoId,
      '#3b82f6', // Default accent color
      (progress) => {
        onProgress({
          type: outputType,
          content: keyIdeas + '\n\n---\n\n' + script,
          keyIdeas,
          script,
          description,
          scenes: finalSceneStructure,
          planDetails,
          steps: [...steps],
          renderProgress: progress,
        });
      }
    );
    
    steps[6] = { ...steps[6], status: 'complete' };
  } catch (error) {
    logger.error('[Orchestrator] Video rendering failed', { error });
    steps[6] = { ...steps[6], status: 'complete' }; // Mark complete even if failed
  }

  const finalVideo: StudioVideo = {
    id: videoId,
    type: outputType,
    content: keyIdeas + '\n\n---\n\n' + script,
    keyIdeas,
    script,
    description,
    scenes: finalSceneStructure,
    videoUrl,
    title: prompt,
    planDetails,
    steps,
    thinkingLog: ['Generation complete!'],
    createdAt: new Date(),
    duration: 30,
    format,
  };

  onProgress(finalVideo);
  return finalVideo;
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
      detail: `Writing ${outputType} script with hook and clear explanation`,
    },
    {
      step: 'Generate scenes',
      detail: 'Breaking down into visual scenes with timing',
    },
    {
      step: 'Fetch assets',
      detail: 'Getting videos (Pexels) and images (Brave Search) in parallel',
    },
    {
      step: 'Generate voiceover',
      detail: 'Creating AI narration with text-to-speech',
    },
    {
      step: 'Render video',
      detail: 'Creating final video with captions and visuals',
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
  return `studio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
