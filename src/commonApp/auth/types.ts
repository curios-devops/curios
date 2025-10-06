// AuthState type for useAuth and AuthProvider context
export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  loading: boolean;
}
export interface AuthResponse {
  user?: object;
  session?: object;
  error?: object | null;
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
