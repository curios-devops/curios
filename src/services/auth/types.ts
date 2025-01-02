export interface AuthResponse {
  success: boolean;
  error?: string;
}

export interface VerificationDetails {
  email: string;
  type: 'magiclink' | 'otp';
}

export type AuthMode = 'signin' | 'signup';