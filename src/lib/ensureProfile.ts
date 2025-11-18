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
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: extractEmail(user),
            subscription_status: 'inactive',
            remaining_searches: 5,
            searches_reset_at: new Date().toISOString(),
            language: 'en',
            accent_color: 'blue',
          })
          .select('id')
          .single();

        if (insertError && insertError.code !== '23505') {
          throw insertError;
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
