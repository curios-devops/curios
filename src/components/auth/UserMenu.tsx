import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../hooks/useSession';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import { useTheme } from '../theme/ThemeContext.tsx';
import { getUserDisplayName } from '../../utils/userName.ts';

interface UserMenuProps {
  email: string;
  isCollapsed?: boolean;
}

export default function UserMenu({ email, isCollapsed }: UserMenuProps) {
  const navigate = useNavigate();
  const { session } = useSession();
  const accentColors = useAccentColor();
  const { accentColor: selectedAccentColor } = useTheme();
  const isGrayAccent = selectedAccentColor === 'gray';
  const avatarBackgroundColor = isGrayAccent ? accentColors.dark : accentColors.primary;
  const avatarTextColor = isGrayAccent ? accentColors.light : 'var(--ui-text-on-accent)';
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // Prefer the user's real name (e.g. from Google); fall back to email.
  const displayName = getUserDisplayName(session?.user) ?? email;
  const initial = displayName[0]?.toUpperCase() ?? email[0].toUpperCase();

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
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-medium shrink-0 overflow-hidden"
        style={{
          backgroundColor: avatarBackgroundColor,
          color: avatarTextColor,
        }}
      >
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
          {displayName.length > 20 ? `${displayName.slice(0, 20)}...` : displayName}
        </span>
      )}
    </button>
  );
}