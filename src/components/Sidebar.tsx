import { useState } from "react";
import { FolderKanban, Globe2, HomeIcon, Library, User } from "lucide-react";
import * as ReactRouterDom from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation.ts";
import { useSession } from "../hooks/useSession.ts";
import { useAccentColor } from "../hooks/useAccentColor.ts";
import NavItem from "./sidebar/NavItem.tsx";
import CollapseButton from "./sidebar/CollapseButton.tsx";
import SignInModal from "./auth/SignInModal.tsx";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import Logo from "./sidebar/Logo.tsx";
import UserMenu from "./auth/UserMenu.tsx";
// Define SidebarProps interface
interface SidebarProps {
 isCollapsed: boolean;
 toggleSidebar: () => void;
 className?: string;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
 const location = ReactRouterDom.useLocation();
  const { session } = useSession(); // Call useSession hook and safely access session
 const { currentLanguage } = useLanguage();
 const { t } = useTranslation();
 const accentColor = useAccentColor();
 const [showSignInModal, setShowSignInModal] = useState<boolean>(false);

 const handleSignInClick = () => setShowSignInModal(true);

 const handleCloseSignInModal = () => setShowSignInModal(false);

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-screen bg-[#f9f9f8] dark:bg-[#2a2a2a] border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-200 ${
          isCollapsed ? "w-20" : "w-48"
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
              label={t("home")}
              isActive={location.pathname === "/"} // Pass isActive prop
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/explore"
              icon={Globe2}
              label={t("explore")}
              isActive={location.pathname === "/explore"} // Pass isActive prop
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/spaces"
              icon={FolderKanban}
              label={t("spaces")}
              isActive={location.pathname === "/spaces"} // Pass isActive prop
              requiresAuth
 isCollapsed={isCollapsed}
            />
            <NavItem
              to="/library"
              icon={Library}
              label={t("library")}
              isActive={location.pathname === "/library"} // Pass isActive prop
              requiresAuth
 isCollapsed={isCollapsed}
            />
             {/* Ensure all NavItem instances have isCollapsed and isActive props */}
             {/* Example for an additional NavItem if needed: */}
             {/* <NavItem to="/settings" icon={Settings} label={t("settings")} isActive={location.pathname === "/settings"} isCollapsed={isCollapsed} /> */}

          </div>
        </nav>

        <div className={`flex-shrink-0 ${isCollapsed ? "px-2" : "px-4"} pb-6`}>
          <div className="space-y-4">
            {isCollapsed && (
              <div className="flex justify-center mb-2">
                <CollapseButton
                  isCollapsed={isCollapsed}
                  onClick={toggleSidebar}
                  position="bottom"
                />
              </div>
            )}
            <div className="border-t border-gray-200 dark:border-gray-800 w-full transition-colors duration-200">
            </div>
            {/* Only render Sign In button in the sidebar for guests */}
            {session
              ? <UserMenu email={session.user.email || ""} isCollapsed={isCollapsed} />
              : (
                <div className="flex flex-col gap-3">
                  {isCollapsed ? (
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={handleSignInClick}
                        className={`flex items-center justify-center p-2.5 rounded-lg transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:bg-[#eef1f2] dark:hover:bg-[#1a1a1a] w-full`}
                        onMouseEnter={(e) => e.currentTarget.style.color = accentColor.primary}
                        onMouseLeave={(e) => e.currentTarget.style.color = ''}
                      >
                        <User size={24} className="transition-colors duration-200" />
                      </button>
                      <div className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover:block bg-gray-100 dark:bg-[#1a1a1a] text-gray-800 dark:text-white text-sm py-1 px-2 rounded whitespace-normal text-wrap break-words">
                        {t('logIn')}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSignInClick}
                      className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:bg-[#eef1f2] dark:hover:bg-[#1a1a1a] w-full`}
                      onMouseEnter={(e) => e.currentTarget.style.color = accentColor.primary}
                      onMouseLeave={(e) => e.currentTarget.style.color = ''}
                    >
                      <User size={24} className="transition-colors duration-200" />
                      <span className="text-sm font-medium tracking-[-0.01em]">
                        {t('logIn')}
                      </span>
                    </button>
                  )}
                </div>
              )}
          </div>
        </div>
      </aside>


 <SignInModal
 isOpen={showSignInModal}
        currentLanguage={currentLanguage}
 onClose={handleCloseSignInModal}
      />
    </>
  );
}
