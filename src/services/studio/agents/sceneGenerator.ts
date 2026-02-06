/**
 * Scene Generator Agent
 * Converts chaptered script with timestamps into structured scenes for video rendering
 */

import { logger } from '../../../utils/logger';
import { VideoScene, SceneStructure, SceneStyle } from '../types';

export class SceneGeneratorAgent {
  private fps = 30; // Standard 30fps for social media videos

  /**
   * Parse script and generate scene structure
   * Input: Chaptered script with YouTube-style timestamps
   * Output: Frame-based scene structure for Remotion
   */
  generateScenes(script: string, duration: number = 30): SceneStructure {
    logger.info('[Scene Generator] Starting scene generation', { 
      scriptLength: script.length, 
      duration 
    });

    const scenes: VideoScene[] = [];
    const lines = script.split('\n').filter(line => line.trim());
    
    let currentChapter = '';
    
    for (const line of lines) {
      // Check if line is a chapter title (bold with **)
      if (line.startsWith('**') && line.endsWith('**')) {
        currentChapter = line.replace(/\*\*/g, '').trim();
        logger.debug('[Scene Generator] Found chapter', { chapter: currentChapter });
        continue;
      }
      
      // Check if line has timestamp format (MM:SS - Text) or (HH:MM:SS - Text)
      const timestampMatch = line.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*-\s*(.+)$/);
      if (timestampMatch) {
        const hours = timestampMatch[3] ? parseInt(timestampMatch[1]) : 0;
        const minutes = timestampMatch[3] ? parseInt(timestampMatch[2]) : parseInt(timestampMatch[1]);
        const seconds = timestampMatch[3] ? parseInt(timestampMatch[3]) : parseInt(timestampMatch[2]);
        const text = timestampMatch[4].trim();
        
        // Convert to total seconds
        const startTime = hours * 3600 + minutes * 60 + seconds;
        const startFrame = startTime * this.fps;
        
        // Determine scene style based on chapter and position
        const style = this.determineSceneStyle(currentChapter, scenes.length);
        
        // Create scene with placeholder end frame
        scenes.push({
          from: startFrame,
          to: startFrame + (5 * this.fps), // Default 5-second duration, will adjust
          text,
          style,
          chapter: currentChapter
        });
        
        logger.debug('[Scene Generator] Created scene', { 
          text: text.substring(0, 30) + '...', 
          startTime,
          startFrame,
          style 
        });
      }
    }
    
    // Adjust scene durations to not overlap and fill gaps
    this.adjustSceneDurations(scenes, duration);
    
    logger.info('[Scene Generator] Scenes generated', { 
      count: scenes.length,
      totalDuration: duration 
    });
    
    return {
      duration,
      fps: this.fps,
      scenes
    };
  }
  
  /**
   * Adjust scene durations to prevent overlaps and fill gaps
   */
  private adjustSceneDurations(scenes: VideoScene[], totalDuration: number): void {
    if (scenes.length === 0) return;
    
    // Adjust each scene to end when the next one starts
    for (let i = 0; i < scenes.length - 1; i++) {
      scenes[i].to = scenes[i + 1].from;
      
      // Ensure minimum scene duration (1 second = 30 frames)
      const minDuration = this.fps * 1;
      if (scenes[i].to - scenes[i].from < minDuration) {
        scenes[i].to = scenes[i].from + minDuration;
      }
    }
    
    // Set last scene to end at video duration
    if (scenes.length > 0) {
      const lastScene = scenes[scenes.length - 1];
      lastScene.to = totalDuration * this.fps;
      
      // Ensure last scene is at least 2 seconds (for outro/branding)
      const minLastDuration = this.fps * 2;
      if (lastScene.to - lastScene.from < minLastDuration) {
        lastScene.to = lastScene.from + minLastDuration;
      }
    }
    
    logger.debug('[Scene Generator] Adjusted scene durations', {
      firstScene: { from: scenes[0]?.from, to: scenes[0]?.to },
      lastScene: { from: scenes[scenes.length - 1]?.from, to: scenes[scenes.length - 1]?.to }
    });
  }
  
  /**
   * Determine scene style based on chapter name and position
   */
  private determineSceneStyle(chapter: string, sceneIndex: number): SceneStyle {
    const lowerChapter = chapter.toLowerCase();
    
    // First scene is always hook (attention grabber)
    if (sceneIndex === 0) {
      logger.debug('[Scene Generator] Scene 0 → hook');
      return 'hook';
    }
    
    // Check chapter keywords for style hints
    if (lowerChapter.includes('hook') || 
        lowerChapter.includes('opening') || 
        lowerChapter.includes('intro')) {
      logger.debug('[Scene Generator] Chapter contains "hook/opening" → hook');
      return 'hook';
    }
    
    if (lowerChapter.includes('conclusion') || 
        lowerChapter.includes('takeaway') || 
        lowerChapter.includes('summary')) {
      logger.debug('[Scene Generator] Chapter contains "conclusion/takeaway" → takeaway');
      return 'takeaway';
    }
    
    if (lowerChapter.includes('outro') || 
        lowerChapter.includes('closing') || 
        lowerChapter.includes('end')) {
      logger.debug('[Scene Generator] Chapter contains "outro/closing" → outro');
      return 'outro';
    }
    
    // Default to explain for main content
    logger.debug('[Scene Generator] Default → explain');
    return 'explain';
  }
  
  /**
   * Validate scene structure
   */
  validateScenes(sceneStructure: SceneStructure): boolean {
    if (!sceneStructure.scenes || sceneStructure.scenes.length === 0) {
      logger.warn('[Scene Generator] No scenes generated');
      return false;
    }
    
    // Check for overlapping scenes
    for (let i = 0; i < sceneStructure.scenes.length - 1; i++) {
      const current = sceneStructure.scenes[i];
      const next = sceneStructure.scenes[i + 1];
      
      if (current.to > next.from) {
        logger.error('[Scene Generator] Overlapping scenes detected', {
          scene1: { from: current.from, to: current.to },
          scene2: { from: next.from, to: next.to }
        });
        return false;
      }
    }
    
    // Check if scenes cover the full duration
    const lastScene = sceneStructure.scenes[sceneStructure.scenes.length - 1];
    const expectedEndFrame = sceneStructure.duration * sceneStructure.fps;
    
    if (Math.abs(lastScene.to - expectedEndFrame) > sceneStructure.fps) {
      logger.warn('[Scene Generator] Scenes do not cover full duration', {
        lastSceneTo: lastScene.to,
        expectedEnd: expectedEndFrame,
        difference: lastScene.to - expectedEndFrame
      });
    }
    
    logger.info('[Scene Generator] Scene validation passed', {
      sceneCount: sceneStructure.scenes.length,
      duration: sceneStructure.duration
    });
    
    return true;
  }
  
  /**
   * Get scene at specific time (for debugging/preview)
   */
  getSceneAtTime(sceneStructure: SceneStructure, timeInSeconds: number): VideoScene | null {
    const frameNumber = timeInSeconds * sceneStructure.fps;
    
    for (const scene of sceneStructure.scenes) {
      if (frameNumber >= scene.from && frameNumber < scene.to) {
        return scene;
      }
    }
    
    return null;
  }
}
