// Environment variable validation and configuration
const requiredEnvVars = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const;

// Optional environment variables with fallbacks
const optionalEnvVars = {
  VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || 'development-key',
  VITE_ADSENSE_PUB_ID: import.meta.env.VITE_ADSENSE_PUB_ID || '',
  VITE_ADSENSE_SIDEBAR_SLOT: import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT || '',
} as const;

// Validate required environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
});

export const env = {
  supabase: {
    url: requiredEnvVars.VITE_SUPABASE_URL,
    anonKey: requiredEnvVars.VITE_SUPABASE_ANON_KEY,
  },
  openai: {
    apiKey: optionalEnvVars.VITE_OPENAI_API_KEY,
  },
  adsense: {
    pubId: optionalEnvVars.VITE_ADSENSE_PUB_ID,
    sidebarSlot: optionalEnvVars.VITE_ADSENSE_SIDEBAR_SLOT,
  }
} as const;