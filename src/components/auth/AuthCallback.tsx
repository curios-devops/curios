import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.ts';
import { Loader2 } from 'lucide-react';
import type { UserType } from '../../types/index.ts';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          // Check if user profile exists, create if not
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: session.user.id,
                  email: session.user.email ?? '',
                  user_type: 'free' as UserType,
                },
              ]);

            if (insertError) {
              console.error('Error creating profile:', insertError);
            }
          }
        }
        
        // Small delay to ensure session is properly set
        setTimeout(() => {
          navigate('/');
        }, 500);
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[#007BFF] animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-medium text-white mb-2">
          Completing sign in...
        </h1>
        <p className="text-gray-400 text-sm">
          Please wait while we verify your credentials.
        </p>
      </div>
    </div>
  );
}