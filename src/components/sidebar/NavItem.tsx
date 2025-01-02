import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { useUserType } from '../../hooks/useUserType';

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  requiresAuth?: boolean;
  authContext?: 'default' | 'pro' | 'library' | 'spaces';
  onAuthRequired?: (context: string) => void;
}

export default function NavItem({ 
  to, 
  icon: Icon, 
  label, 
  isActive, 
  isCollapsed,
  requiresAuth = false,
  authContext = 'default',
  onAuthRequired
}: NavItemProps) {
  const navigate = useNavigate();
  const userType = useUserType();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (requiresAuth && userType === 'guest') {
      onAuthRequired?.(authContext);
      return;
    }

    navigate(to);
  };

  return (
    <a 
      href={to}
      onClick={handleClick}
      className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} p-2.5 rounded-lg transition-colors ${
        isActive 
          ? 'text-[#007BFF] bg-[#1a1a1a]' 
          : 'text-gray-400 hover:text-[#007BFF] hover:bg-[#1a1a1a]'
      }`}
    >
      <Icon size={24} />
      {!isCollapsed && <span className="text-[15px]">{label}</span>}
    </a>
  );
}