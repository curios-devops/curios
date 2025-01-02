import { supabase } from '../../lib/supabase';
import type { AuthResponse, VerificationDetails } from './types';

export async function verifyMagicLink(details: VerificationDetails): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: details.email,
      token: details.token,
      type: details.type
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify'
    };
  }
}