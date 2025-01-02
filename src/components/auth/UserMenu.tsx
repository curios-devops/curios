import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/auth';

interface UserMenuProps {
  email: string;
  isCollapsed?: boolean;
}

export default function UserMenu({ email, isCollapsed }: UserMenuProps) {
  const navigate = useNavigate();
  const initial = email[0].toUpperCase();

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
      <div className="w-8 h-8 rounded-full bg-[#007BFF] flex items-center justify-center text-white font-medium shrink-0">
        {initial}
      </div>
      {!isCollapsed && (
        <span className="text-gray-300 text-sm truncate">
          {email.length > 20 ? `${email.slice(0, 20)}...` : email}
        </span>
      )}
    </button>
  );
}