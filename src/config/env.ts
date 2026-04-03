// import process from "node:process"; // Removed for browser compatibility
import { logger } from '../utils/logger';

// Environment variable validation and configuration
const requiredEnvVars = {
  VITE_SUPABASE_URL: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined,
  VITE_SUPABASE_ANON_KEY: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : undefined
} as const;

// Optional environment variables with fallbacks
const optionalEnvVars = {
  VITE_ADSENSE_PUB_ID: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ADSENSE_PUB_ID : '') || '',
  VITE_ADSENSE_SIDEBAR_SLOT: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ADSENSE_SIDEBAR_SLOT : '') || '',
  VITE_RAPIDAPI_KEY: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_RAPIDAPI_KEY : '') || '',
  VITE_BRAVE_API_KEY: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_BRAVE_API_KEY : '') || '',
  VITE_TAVILY_API_KEY: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_TAVILY_API_KEY : '') || '',
  VITE_STRIPE_PUBLISHABLE_KEY: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY : '') || '',
  VITE_STRIPE_SECRET_KEY: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_STRIPE_SECRET_KEY : '') || '',
  VITE_STRIPE_WEBHOOK_SECRET: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_STRIPE_WEBHOOK_SECRET : '') || '',
  VITE_STRIPE_MONTHLY_PRICE_ID: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_STRIPE_MONTHLY_PRICE_ID : '') || '',
  VITE_STRIPE_YEARLY_PRICE_ID: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_STRIPE_YEARLY_PRICE_ID : '') || '',
  VITE_GOOGLE_AI_API_KEY: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GOOGLE_AI_API_KEY : '') || '',
  VITE_ANAM_AVATAR_CORA_ID: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ANAM_AVATAR_CORA_ID : '') || '',
  VITE_ANAM_AVATAR_LIZ_ID: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ANAM_AVATAR_LIZ_ID : '') || '',
  VITE_ANAM_AVATAR_ASTRID_ID: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ANAM_AVATAR_ASTRID_ID : '') || '',
  VITE_ANAM_AVATAR_LEO_ID: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ANAM_AVATAR_LEO_ID : '') || '',
  VITE_ANAM_AVATAR_FINN_ID: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ANAM_AVATAR_FINN_ID : '') || '',
  VITE_ANAM_AVATAR_PABLO_ID: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ANAM_AVATAR_PABLO_ID : '') || '',
  VITE_ELEVENLABS_STT_MODEL_ID: (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ELEVENLABS_STT_MODEL_ID : '') || '',
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
  // NOTE: OpenAI API keys are handled server-side only via Netlify functions
  // Never expose OpenAI API keys to the client
  adsense: {
    pubId: optionalEnvVars.VITE_ADSENSE_PUB_ID,
    sidebarSlot: optionalEnvVars.VITE_ADSENSE_SIDEBAR_SLOT,
  },
  rapidapi: {
    key: optionalEnvVars.VITE_RAPIDAPI_KEY,
    host: 'searx-search-api.p.rapidapi.com'
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
  },
  anam: {
    avatars: {
      cora: optionalEnvVars.VITE_ANAM_AVATAR_CORA_ID,
      liz: optionalEnvVars.VITE_ANAM_AVATAR_LIZ_ID,
      astrid: optionalEnvVars.VITE_ANAM_AVATAR_ASTRID_ID,
      leo: optionalEnvVars.VITE_ANAM_AVATAR_LEO_ID,
      finn: optionalEnvVars.VITE_ANAM_AVATAR_FINN_ID,
      pablo: optionalEnvVars.VITE_ANAM_AVATAR_PABLO_ID,
    }
  },
  google: {
    aiApiKey: optionalEnvVars.VITE_GOOGLE_AI_API_KEY,
  },
  elevenLabs: {
    sttModelId: optionalEnvVars.VITE_ELEVENLABS_STT_MODEL_ID || 'scribe_v2_realtime',
  }
} as const;