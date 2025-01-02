import React, { useState } from 'react';
import { useAuthForm } from './hooks/useAuthForm';
import FormInput from './components/FormInput';
import type { AuthFormProps } from './types/auth';
import { supabase } from '../../lib/supabase';

export default function AuthForm({ mode }: AuthFormProps) {
  const { formData, errors, validateForm, handleChange } = useAuthForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <FormInput
        id="email"
        name="email"
        type="email"
        label="Email"
        value={formData.email}
        error={errors.email}
        onChange={handleChange}
        placeholder="Enter your email"
        disabled={loading}
      />

      <FormInput
        id="password"
        name="password"
        type="password"
        label="Password"
        value={formData.password}
        error={errors.password}
        onChange={handleChange}
        placeholder="Enter your password"
        disabled={loading}
      />

      <button
        type="submit"
        disabled={loading}
        className={`
          w-full 
          bg-[#007BFF] 
          text-white 
          p-3 
          rounded-lg 
          transition-all
          ${loading 
            ? 'opacity-70 cursor-not-allowed' 
            : 'hover:bg-[#0056b3]'
          }
        `}
      >
        {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
      </button>
    </form>
  );
}