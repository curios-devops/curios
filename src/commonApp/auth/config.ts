export const AUTH_CONFIG = {
  redirectUrl: `${window.location.origin}/auth/callback`,
} as const;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: 'lax' as const,
  secure: true,
};