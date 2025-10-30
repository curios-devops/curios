import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.ts';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        
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