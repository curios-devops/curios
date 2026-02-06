/**
 * Studio service configuration
 */
export const STUDIO_CONFIG = {
  // Video generation settings (for future implementation)
  video: {
    defaultDuration: 30, // seconds
    fps: 30,
    formats: {
      vertical: { width: 1080, height: 1920 }, // 9:16
      horizontal: { width: 1920, height: 1080 }, // 16:9
    },
  },

  // Content generation settings
  generation: {
    maxRetries: 3,
    timeout: 60000, // 60 seconds
    streamUpdates: true,
  },

  // Artifact limits
  limits: {
    minPromptLength: 3,
    maxPromptLength: 500,
    maxContentLength: 50000,
  },

  // Feature flags
  features: {
    videoGeneration: false, // Not yet implemented
    imageGeneration: false, // Not yet implemented
    gameGeneration: false, // Not yet implemented
    documentGeneration: true, // Currently available
  },
} as const;

export type StudioConfig = typeof STUDIO_CONFIG;
