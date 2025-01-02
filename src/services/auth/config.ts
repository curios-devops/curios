export const AUTH_CONFIG = {
  redirectUrl: `${window.location.origin}/auth/callback`,
  flowType: 'pkce' as const,
} as const;