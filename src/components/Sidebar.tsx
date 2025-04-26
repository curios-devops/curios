import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { FolderKanban, Globe2, HomeIcon, Library } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation.ts";
import Logo from "./sidebar/Logo.tsx";
import NavItem from "./sidebar/NavItem.tsx";
import CollapseButton from "./sidebar/CollapseButton.tsx";
import AuthModal from "./auth/AuthModal.tsx";
import AuthButtons from "./auth/AuthButtons.tsx";
import UserMenu from "./auth/UserMenu.tsx";
import { useSession } from "../hooks/useSession.ts";

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const location = useLocation();
  const { session } = useSession();
  const { t } = useTranslation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authContext, setAuthContext] = useState<"default" | "pro">("default");

  const handleAuthRequired = (context: string) => {
    setAuthContext(
      context === "library" || context === "spaces"
        ? "default"
        : context as "default" | "pro",
    );
    setShowAuthModal(true);
  };

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-screen bg-[#f9f9f8] dark:bg-[#111111] border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-200 ${
          isCollapsed ? "w-20" : "w-56"
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
              isActive={location.pathname === "/"}
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/explore"
              icon={Globe2}
              label={t("explore")}
              isActive={location.pathname === "/explore"}
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/spaces"
              icon={FolderKanban}
              label={t("spaces")}
              isActive={location.pathname === "/spaces"}
              isCollapsed={isCollapsed}
              requiresAuth
              authContext="spaces"
              onAuthRequired={handleAuthRequired}
            />
            <NavItem
              to="/library"
              icon={Library}
              label={t("library")}
              isActive={location.pathname === "/library"}
              isCollapsed={isCollapsed}
              requiresAuth
              authContext="library"
              onAuthRequired={handleAuthRequired}
            />
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
            {session
              ? (
                <UserMenu
                  email={session.user.email || ""}
                  isCollapsed={isCollapsed}
                />
              )
              : (
                <AuthButtons
                  session={session}
                  isCollapsed={isCollapsed}
                  onSignInClick={() => handleAuthRequired("default")}
                  onSignUpClick={() => handleAuthRequired("default")}
                />
              )}
          </div>
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
