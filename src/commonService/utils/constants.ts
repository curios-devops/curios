// API timeouts and retry settings
// API timeouts for different services
export const API_TIMEOUTS = {
  TAVILY: 10000,  // 10 seconds for Tavily fallback timeout
  SEARXNG: 10000, // 10 seconds for SearxNG timeout (reduced to prevent cascading delays)
  BRAVE: 10000,   // 10 seconds for Brave search timeout (reduced to prevent stuck states)
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
  WEB: 10,     // Cap at 10 results (parametric for all searchers)
  IMAGES: 10,  // Cap at 10 results
  VIDEO: 10,   // Cap at 10 results
  NEWS: 10     // News results limit (now matches others)
};

// Limit concurrent requests
export const CONCURRENT_REQUESTS = 1;

// OpenAI token limits
export const OPENAI_LIMITS = {
  maxInputTokens: 2000,
  maxOutputTokens: 500
};