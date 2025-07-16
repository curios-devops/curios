import { useState } from "react";
import { useLocation } from "react-router-dom";
import { FolderKanban, Globe2, HomeIcon, Library } from "lucide-react";
// A comment to trigger a file update
import { useTranslation } from "../../hooks/useTranslation.ts";
import Logo from "../sidebar/Logo.tsx";
import NavItem from "../sidebar/NavItem.tsx";
import CollapseButton from "../sidebar/CollapseButton.tsx";
import VerificationModal from "../auth/components/VerificationModal.tsx";
import AuthButtons from "../auth/AuthButtons.tsx";
import UserMenu from "../auth/UserMenu.tsx";
import { useSession } from "../../hooks/useSession.ts";

interface SidebarProps { 
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const location = useLocation();
  const { session } = useSession();
  const { t } = useTranslation(); // Import useTranslation hook
  const [showVerificationModal, setShowVerificationModal] = useState(false); // State to control modal visibility
  const [modalEmail, setModalEmail] = useState(""); // State to hold email for the modal
  const handleAuthRequired = (_context: string, email?: string) => { // handle authentication requirement, potentially show a modal
    setModalEmail(email || "");
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

      {showVerificationModal && (
        <VerificationModal
          email={modalEmail} // Assuming email is required by VerificationModalProps
          onClose={() => setShowVerificationModal(false)} // Function to close the modal
        />
      )}
    </>
  );
}