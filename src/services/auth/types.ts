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
