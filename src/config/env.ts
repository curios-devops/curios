// Environment variable validation and configuration
const requiredEnvVars = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
} as const;

// Optional environment variables with fallbacks
const optionalEnvVars = {
  VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  VITE_OPENAI_ORG_ID: import.meta.env.VITE_OPENAI_ORG_ID || '',
  VITE_OPENAI_PROJECT_ID: import.meta.env.VITE_OPENAI_PROJECT_ID || '',
  VITE_ADSENSE_PUB_ID: import.meta.env.VITE_ADSENSE_PUB_ID || '',
  VITE_ADSENSE_SIDEBAR_SLOT: import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT || '',
  VITE_RAPIDAPI_KEY: import.meta.env.VITE_RAPIDAPI_KEY || '',
  VITE_BRAVE_API_KEY: import.meta.env.VITE_BRAVE_API_KEY || '',
  VITE_TAVILY_API_KEY: import.meta.env.VITE_TAVILY_API_KEY || '',
  VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  VITE_STRIPE_SECRET_KEY: import.meta.env.VITE_STRIPE_SECRET_KEY || '',
  VITE_STRIPE_WEBHOOK_SECRET: import.meta.env.VITE_STRIPE_WEBHOOK_SECRET || '',
  VITE_STRIPE_MONTHLY_PRICE_ID: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || '',
  VITE_STRIPE_YEARLY_PRICE_ID: import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID || '',
} as const;

// Validate required environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    logger.error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  supabase: {
    url: requiredEnvVars.VITE_SUPABASE_URL || '',
    anonKey: requiredEnvVars.VITE_SUPABASE_ANON_KEY || '',
  },
  openai: {
    apiKey: optionalEnvVars.VITE_OPENAI_API_KEY,
    orgId: optionalEnvVars.VITE_OPENAI_ORG_ID,
    projectId: optionalEnvVars.VITE_OPENAI_PROJECT_ID,
  },
  adsense: {
    pubId: optionalEnvVars.VITE_ADSENSE_PUB_ID,
    sidebarSlot: optionalEnvVars.VITE_ADSENSE_SIDEBAR_SLOT,
  },
  rapidapi: {
    key: optionalEnvVars.VITE_RAPIDAPI_KEY,
    host: 'searxng.p.rapidapi.com'
  },
  brave: {
    apiKey: optionalEnvVars.VITE_BRAVE_API_KEY // Already has fallback in optionalEnvVars
  },
  tavily: {
    apiKey: optionalEnvVars.VITE_TAVILY_API_KEY
  },
  stripe: {
    publishableKey: optionalEnvVars.VITE_STRIPE_PUBLISHABLE_KEY,
    secretKey: optionalEnvVars.VITE_STRIPE_SECRET_KEY,
    webhookSecret: optionalEnvVars.VITE_STRIPE_WEBHOOK_SECRET,
    prices: {
      month: optionalEnvVars.VITE_STRIPE_MONTHLY_PRICE_ID,
      year: optionalEnvVars.VITE_STRIPE_YEARLY_PRICE_ID,
    }
  }
} as const;