export const SEARX_INSTANCES = [
  'https://searx.tiekoetter.com',
  'https://search.rhscz.eu',
  'https://searx.colbster937.dev'
];

// Fallback API endpoints
export const FALLBACK_APIS = {
  wikipedia: 'https://en.wikipedia.org/w/api.php',
};

export const RETRY_OPTIONS = {
  maxRetries: 3,
  delayMs: 1000,
  timeout: 15000,
  exponentialBackoff: true
};

export const API_TIMEOUT = 15000;

export const MAX_RESULTS = 5;

export const CONCURRENT_REQUESTS = 2;

// Search configuration
export const SEARCH_CONFIG = {
  allowHttpImages: true, // Allow HTTP images for better coverage
  minRelevanceScore: 0.1, // Lower score threshold
  maxRetryAttempts: 2, // Increased retries before marking unhealthy
  healthCheckInterval: 300000, // 5 minutes
  usePost: true, // Use POST for complex queries
  engines: {
    required: ['google', 'bing', 'duckduckgo', 'wikipedia'],
    fallback: ['qwant', 'brave', 'mojeek'] // Alternative engines
  }
};