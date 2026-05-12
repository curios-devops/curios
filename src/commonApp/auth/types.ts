// AuthState type for useAuth and AuthProvider context
export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  loading: boolean;
}

export type AuthMode = 'signin' | 'signup';

export interface VerificationDetails {
  email: string;
  token: string;
  type: 'email' | 'magiclink' | 'signup';
}

export type AuthError =
  | string
  | {
      message?: string;
      code?: string;
      [key: string]: unknown;
    }
  | null;

export interface AuthResponse {
  success: boolean;
  user?: object;
  session?: object;
  error?: AuthError;
}

export interface SignOutResponse {
  error: object | null;
}

export interface CookieOptions {
  maxAge: number;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
}
