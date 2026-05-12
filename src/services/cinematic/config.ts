/**
 * CinematicAI Configuration
 * Configure video generation providers and settings
 */

export type VideoProvider = 'sora' | 'veo' | 'google-veo';

export interface CinematicConfig {
  provider: VideoProvider;
  apiKeys: {
    openai?: string;
    veo?: string;
    googleCloud?: string;
  };
  generation: {
    maxRetries: number;
    pollingInterval: number;
    maxPollingTime: number;
    batchSize: number;
  };
  video: {
    defaultFormat: 'vertical' | 'horizontal';
    defaultQuality: 'standard' | 'hd';
    enableCaching: boolean;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: CinematicConfig = {
  // Default provider (can be overridden by env var)
  provider: (import.meta.env.VITE_VIDEO_PROVIDER as VideoProvider) || 'veo',

  apiKeys: {
    openai: import.meta.env.VITE_OPENAI_API_KEY,
    veo: import.meta.env.VITE_VEO_API_KEY,
    googleCloud: import.meta.env.VITE_GOOGLE_CLOUD_API_KEY,
  },

  generation: {
    maxRetries: 3,
    pollingInterval: 3000, // 3 seconds
    maxPollingTime: 180000, // 3 minutes
    batchSize: 3, // Generate 3 scenes in parallel
  },

  video: {
    defaultFormat: 'vertical',
    defaultQuality: 'standard',
    enableCaching: true,
  },
};

/**
 * Provider-specific configuration
 */
export const PROVIDER_CONFIG = {
  sora: {
    name: 'OpenAI Sora',
    endpoint: 'https://api.openai.com/v1/videos/generations',
    models: ['sora-1.0-turbo'],
    costPerSecond: 0.80, // Estimated $0.80 per second
    maxDuration: 10, // Max 10 seconds per scene
    availableQualities: ['standard', 'hd'],
  },

  veo: {
    name: 'VEO3',
    endpoint: 'https://veo3api.com',
    models: ['veo3-fast', 'veo3', 'veo3-hd'],
    costPerSecond: 0.50, // Estimated $0.50 per second
    maxDuration: 10, // Max 10 seconds per scene
    availableQualities: ['standard', 'hd'],
  },

  'google-veo': {
    name: 'Google Veo (Vertex AI)',
    endpoint: 'https://us-central1-aiplatform.googleapis.com',
    models: ['veo-001'],
    costPerSecond: 0.40, // Estimated $0.40 per second
    maxDuration: 8, // Max 8 seconds per scene
    availableQualities: ['standard', 'hd'],
  },
};

/**
 * Get active provider configuration
 */
export function getProviderConfig() {
  const provider = DEFAULT_CONFIG.provider;
  return PROVIDER_CONFIG[provider];
}

/**
 * Check if provider is configured
 */
export function isProviderConfigured(provider: VideoProvider): boolean {
  switch (provider) {
    case 'sora':
      return !!DEFAULT_CONFIG.apiKeys.openai;
    case 'veo':
      return !!DEFAULT_CONFIG.apiKeys.veo;
    case 'google-veo':
      return !!DEFAULT_CONFIG.apiKeys.googleCloud;
    default:
      return false;
  }
}

/**
 * Get estimated cost per video
 */
export function getEstimatedCost(
  provider: VideoProvider,
  sceneDurations: number[]
): number {
  const config = PROVIDER_CONFIG[provider];
  const totalDuration = sceneDurations.reduce((sum, d) => sum + d, 0);

  return totalDuration * config.costPerSecond;
}
