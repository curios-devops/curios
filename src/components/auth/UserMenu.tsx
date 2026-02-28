import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../hooks/useSession';

interface UserMenuProps {
  email: string;
  isCollapsed?: boolean;
}

export default function UserMenu({ email, isCollapsed }: UserMenuProps) {
  const navigate = useNavigate();
  const { session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const initial = email[0].toUpperCase();

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!error && data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchProfile();
  }, [session?.user?.id]);

  const handleClick = () => {
    navigate('/settings');
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors w-full
        ${isCollapsed ? 'justify-center' : ''}
      `}
    >
      <div className="w-8 h-8 rounded-full bg-[#007BFF] flex items-center justify-center text-white font-medium shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={email}
            className="w-full h-full object-cover"
          />
        ) : (
          initial
        )}
      </div>
      {!isCollapsed && (
        <span className="text-gray-300 text-sm truncate">
          {email.length > 20 ? `${email.slice(0, 20)}...` : email}
        </span>
      )}
    </button>
  );
}