import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HomeIcon, Globe2, FolderKanban, Library } from 'lucide-react';
import Logo from './sidebar/Logo';
import NavItem from './sidebar/NavItem';
import CollapseButton from './sidebar/CollapseButton';
import AuthModal from './auth/AuthModal';
import AuthButtons from './auth/AuthButtons';
import UserMenu from './auth/UserMenu';
import { useSession } from '../hooks/useSession';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const location = useLocation();
  const { session } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authContext, setAuthContext] = useState<'default' | 'pro' | 'library' | 'spaces'>('default');

  const handleAuthRequired = (context: string) => {
    setAuthContext(context as 'default' | 'pro' | 'library' | 'spaces');
    setShowAuthModal(true);
  };

  const messages = {
    library: {
      title: "Save Your Research",
      subtitle: "Sign in or sign up to save and organize your research"
    },
    spaces: {
      title: "Join the Community",
      subtitle: "Sign in or sign up to create and join research spaces"
    }
  };

  return (
    <>
      <aside 
        className={`fixed left-0 top-0 h-screen bg-[#111111] border-r border-gray-800 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-56'
        }`}
      >
        <div className="flex-shrink-0 p-4">
          <div className="flex items-center gap-3">
            <Logo isCollapsed={isCollapsed} />
            {!isCollapsed && (
              <CollapseButton 
                isCollapsed={isCollapsed} 
                onClick={toggleSidebar} 
                position="top" 
              />
            )}
          </div>
        </div>

        <nav className="flex-1 px-2 py-4">
          <div className="space-y-1">
            <NavItem
              to="/"
              icon={HomeIcon}
              label="Home"
              isActive={location.pathname === '/'}
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/explore"
              icon={Globe2}
              label="Explore"
              isActive={location.pathname === '/explore'}
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/spaces"
              icon={FolderKanban}
              label="Spaces"
              isActive={location.pathname === '/spaces'}
              isCollapsed={isCollapsed}
              requiresAuth
              authContext="spaces"
              onAuthRequired={handleAuthRequired}
            />
            <NavItem
              to="/library"
              icon={Library}
              label="Library"
              isActive={location.pathname === '/library'}
              isCollapsed={isCollapsed}
              requiresAuth
              authContext="library"
              onAuthRequired={handleAuthRequired}
            />
          </div>
        </nav>

        <div className={`flex-shrink-0 mt-auto ${isCollapsed ? 'px-2' : 'px-4'} pb-6`}>
          {isCollapsed ? (
            <div className="space-y-4">
              <CollapseButton 
                isCollapsed={isCollapsed} 
                onClick={toggleSidebar} 
                position="bottom" 
              />
              <div className="border-t border-gray-800 w-full"></div>
              {session ? (
                <UserMenu email={session.user.email || ''} isCollapsed={true} />
              ) : (
                <AuthButtons
                  session={session}
                  isCollapsed={isCollapsed}
                  onSignInClick={() => handleAuthRequired('default')}
                  onSignUpClick={() => handleAuthRequired('default')}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-t border-gray-800 w-full"></div>
              {session ? (
                <UserMenu email={session.user.email || ''} isCollapsed={false} />
              ) : (
                <AuthButtons
                  session={session}
                  isCollapsed={isCollapsed}
                  onSignInClick={() => handleAuthRequired('default')}
                  onSignUpClick={() => handleAuthRequired('default')}
                />
              )}
            </div>
          )}
        </div>
      </aside>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        context={authContext}
      />
    </>
  );
}