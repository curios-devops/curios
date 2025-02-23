// API configuration
export const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': window.location.origin
  },
  timeout: 15000 // 15 seconds
};

// Rate limiting configuration
export const RATE_LIMIT = {
  maxRequestsPerMinute: 20,
  retryDelay: 5000,
  maxRetries: 3
};

// Search configuration
export const SEARCH_CONFIG = {
  allowHttpImages: false,
  minRelevanceScore: 0.1,
  maxRetryAttempts: 3,
  healthCheckInterval: 300000, // 5 minutes
  usePost: true,
  engines: {
    required: ['brave', 'tavily'],
    fallback: ['duckduckgo', 'wikipedia']
  }
};

// Fallback API endpoints
export const FALLBACK_APIS = {
  wikipedia: 'https://en.wikipedia.org/w/api.php',
  duckduckgo: 'https://api.duckduckgo.com',
  tavily: 'https://api.tavily.com/search'
};

// Export all configurations
export { API_TIMEOUT, MAX_RESULTS, RETRY_OPTIONS } from './constants';