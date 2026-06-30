import type { User } from '@supabase/supabase-js';

/**
 * Returns the user's real display name from auth metadata (e.g. Google's
 * full_name), or null when only an email is available. We intentionally do NOT
 * fall back to the email username here so callers can decide what to show when
 * there is no real name.
 */
export function getUserDisplayName(user?: User | null): string | null {
  if (!user) return null;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const nameFields = ['full_name', 'name', 'display_name', 'user_name', 'preferred_username'];

  for (const field of nameFields) {
    const value = metadata[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

/**
 * First name only (what we greet the user with). Null when there is no name.
 */
export function getUserFirstName(user?: User | null): string | null {
  const full = getUserDisplayName(user);
  if (!full) return null;
  return full.split(/\s+/)[0];
}
