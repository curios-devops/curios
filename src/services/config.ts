export const SEARX_INSTANCES = [
  'https://searx.tiekoetter.com',
  'https://search.bus-hit.me',
  'https://searx.thegpm.org',
];

// Fallback API endpoints
export const FALLBACK_APIS = {
  duckduckgo: 'https://api.duckduckgo.com',
  wikipedia: 'https://en.wikipedia.org/w/api.php',
};

export const RETRY_OPTIONS = {
  maxRetries: 3,
  delayMs: 1000,
  timeout: 15000, // Increased timeout
};

export const API_TIMEOUT = 15000; // Increased from 10s to 15s

export const MAX_RESULTS = 5;

export const CONCURRENT_REQUESTS = 2;