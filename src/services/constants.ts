// API timeouts and retry settings
// API timeouts for different services
export const API_TIMEOUTS = {
  TAVILY: 10000,  // 10 seconds for Tavily fallback timeout
  SEARXNG: 15000, // 15 seconds for SearxNG timeout
  GENERAL: 15000  // 15 seconds general timeout
} as const;

export const RETRY_OPTIONS = {
  maxRetries: 1,
  delayMs: 1000,
  timeout: 15000,
  exponentialBackoff: true
};

// Limit results to reduce token usage
export const MAX_RESULTS = {
  WEB: 8,     // Cap at 8 results
  IMAGES: 7,  // Cap at 7 results
  VIDEO: 8    // Cap at 8 results
};

// Limit concurrent requests
export const CONCURRENT_REQUESTS = 1;

// OpenAI token limits
export const OPENAI_LIMITS = {
  maxInputTokens: 2000,
  maxOutputTokens: 500
};