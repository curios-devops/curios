import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';
import { logger } from '../utils/logger.ts';

const inflightEnsures = new Map<string, Promise<void>>();

function extractEmail(user: User): string | null {
  if (user.email) {
    return user.email;
  }

  const identityEmail = user.identities?.find((identity) =>
    Boolean(identity.identity_data?.email)
  )?.identity_data?.email;

  if (identityEmail) {
    return identityEmail as string;
  }

  const metadataEmail = typeof user.user_metadata === 'object'
    ? (user.user_metadata.email as string | undefined)
    : undefined;

  return metadataEmail ?? null;
}

function getAuthProvider(user: User): string {
  const provider = user.app_metadata?.provider;
  if (typeof provider === 'string' && provider.length > 0) {
    return provider;
  }

  const identityProvider = user.identities?.find((identity) =>
    typeof identity.provider === 'string'
  )?.provider;

  return identityProvider ?? 'email';
}

function getDisplayName(user: User): string | null {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const nameFields = ['full_name', 'name', 'user_name', 'preferred_username'];

  for (const field of nameFields) {
    const value = metadata[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  if (user.email) {
    return user.email.split('@')[0] ?? null;
  }

  return null;
}

function getAvatarUrl(user: User): string | null {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const avatarCandidates = ['avatar_url', 'picture', 'avatar'];

  for (const field of avatarCandidates) {
    const value = metadata[field];
    if (typeof value === 'string' && value.startsWith('http')) {
      return value;
    }
  }

  const identityWithAvatar = user.identities?.find((identity) => {
    const data = identity.identity_data as Record<string, unknown> | null;
    return typeof data?.avatar_url === 'string';
  });

  const avatarFromIdentity = identityWithAvatar?.identity_data as Record<string, unknown> | null;
  if (typeof avatarFromIdentity?.avatar_url === 'string') {
    return avatarFromIdentity.avatar_url;
  }

  return null;
}

export function ensureProfileExists(user: User | null | undefined): Promise<void> {
  if (!user) {
    return Promise.resolve();
  }

  const existing = inflightEnsures.get(user.id);
  if (existing) {
    return existing;
  }

  const ensurePromise = (async () => {
    try {
      // Try to select with new columns, but gracefully handle if they don't exist yet
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, auth_provider, last_sign_in_provider')
        .eq('id', user.id)
        .maybeSingle();

      // If column doesn't exist (42703), fall back to basic profile check
      if (error && error.code === '42703') {
        logger.warn('Profile columns not yet migrated, using basic profile check');
        const { data: basicData, error: basicError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', user.id)
          .maybeSingle();

        if (basicError && basicError.code !== 'PGRST116') {
          throw basicError;
        }

        // If no profile exists, create basic one
        if (!basicData) {
          const preferredLanguage = typeof localStorage !== 'undefined' ? localStorage.getItem('preferredLanguage') : 'en';
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: extractEmail(user),
              subscription_status: 'inactive',
              remaining_searches: 5,
              searches_reset_at: new Date().toISOString(),
              language: preferredLanguage || 'en',
              accent_color: 'blue',
            })
            .select('id')
            .single();

          if (insertError && insertError.code !== '23505') {
            throw insertError;
          }
        }
        return; // Exit early, migration needed
      }

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const provider = getAuthProvider(user);
      const profileMetadata = {
        email: extractEmail(user),
        display_name: getDisplayName(user),
        avatar_url: getAvatarUrl(user),
        auth_provider: provider,
        last_sign_in_at: user.last_sign_in_at,
        last_sign_in_provider: provider,
      };

      if (!data) {
        const preferredLanguage = typeof localStorage !== 'undefined' ? localStorage.getItem('preferredLanguage') : 'en';
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            ...profileMetadata,
            subscription_status: 'inactive',
            remaining_searches: 5,
            searches_reset_at: new Date().toISOString(),
            language: preferredLanguage || 'en',
            accent_color: 'blue',
          })
          .select('id')
          .single();

        if (insertError && insertError.code !== '23505') {
          throw insertError;
        }
      } else {
        const updates: Record<string, unknown> = { id: user.id };

        if (profileMetadata.email && data.email !== profileMetadata.email) {
          updates.email = profileMetadata.email;
        }

        if (!data.display_name && profileMetadata.display_name) {
          updates.display_name = profileMetadata.display_name;
        }

        if (!data.avatar_url && profileMetadata.avatar_url) {
          updates.avatar_url = profileMetadata.avatar_url;
        }

        if (profileMetadata.auth_provider && data.auth_provider !== profileMetadata.auth_provider) {
          updates.auth_provider = profileMetadata.auth_provider;
        }

        if (data.last_sign_in_provider !== profileMetadata.last_sign_in_provider) {
          updates.last_sign_in_provider = profileMetadata.last_sign_in_provider;
        }

        updates.last_sign_in_at = profileMetadata.last_sign_in_at;

        if (Object.keys(updates).length > 1) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

          if (updateError) {
            throw updateError;
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to ensure profile exists', {
        error,
        userId: user.id,
      });
      throw error;
    } finally {
      inflightEnsures.delete(user.id);
    }
  })();

  inflightEnsures.set(user.id, ensurePromise);
  return ensurePromise;
}
