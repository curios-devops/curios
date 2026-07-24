import { useState } from "react";
import { createPortal } from "react-dom";
import { Compass, FolderKanban, Globe2, HomeIcon, Library } from "lucide-react";
import * as ReactRouterDom from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation.ts";
import { useSession } from "../hooks/useSession.ts";
import { useSubscription } from "../hooks/useSubscription.ts";
import NavItem from "./sidebar/NavItem.tsx";
import CollapseButton from "./sidebar/CollapseButton.tsx";
import SignInModal from "./auth/SignInModal.tsx";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import Logo from "./sidebar/Logo.tsx";
import SidebarGuestSection from "./sidebar/SidebarGuestSection.tsx";
import SidebarUserSection from "./sidebar/SidebarUserSection.tsx";
// Define SidebarProps interface
interface SidebarProps {
 isCollapsed: boolean;
 toggleSidebar: () => void;
 className?: string;
 // When embedded inside another wrapper (like the mobile drawer),
 // avoid using fixed positioning and let the parent control size and position.
 embedded?: boolean;
 // The Home promo banner is a full-width sticky bar (z-60) that overlaps the
 // fixed sidebar's top — push the sidebar's top content down to clear it.
 hasTopBanner?: boolean;
}

export default function Sidebar({ isCollapsed, toggleSidebar, embedded = false, hasTopBanner = false }: SidebarProps) {
 const location = ReactRouterDom.useLocation();
  const { session } = useSession(); // Call useSession hook and safely access session
 const { subscription, loading: subLoading } = useSubscription(session);
 const isPro = !!session && !!subscription?.isActive;
 const { currentLanguage } = useLanguage();
 const { t } = useTranslation();
 const [showSignInModal, setShowSignInModal] = useState<boolean>(false);

 const handleSignInClick = () => setShowSignInModal(true);

 const handleCloseSignInModal = () => setShowSignInModal(false);

 // Handle auth required for protected nav items
 const handleAuthRequired = () => {
   setShowSignInModal(true);
 };

  return (
    <>
      <aside
        className={`${embedded ? 'relative h-full w-full' : 'fixed left-0 top-0 h-screen'} border-r flex flex-col transition-all duration-200 ${
          embedded ? '' : (isCollapsed ? 'w-20' : 'w-48')
        }`}
        style={{
          backgroundColor: 'var(--ui-bg-secondary)',
          borderColor: 'var(--ui-border-subtle)',
          color: 'var(--ui-text-secondary)',
        }}
      >
        {/* Extra top padding when the Home banner is present so it doesn't
            cover the logo (the banner is ~36px tall). */}
        <div className="flex-shrink-0 p-4" style={hasTopBanner ? { paddingTop: '40px' } : undefined}>
          {/* Collapsed: logo takes the full narrow width, so the collapse
              button stacks below it instead of squeezing in beside it. */}
          <div className={isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3'}>
            <Logo isCollapsed={isCollapsed} />
            <CollapseButton
              isCollapsed={isCollapsed}
              onClick={toggleSidebar}
            />
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
              to="/feed"
              icon={Compass}
              label="Discover"
              isActive={location.pathname === "/feed"}
              isCollapsed={isCollapsed}
            />
            <NavItem
              to="/spaces"
              icon={FolderKanban}
              label={t("spaces")}
              isActive={location.pathname === "/spaces"} // Pass isActive prop
              requiresAuth
              isCollapsed={isCollapsed}
              onAuthRequired={handleAuthRequired}
            />
            <NavItem
              to="/library"
              icon={Library}
              label={t("library")}
              isActive={location.pathname === "/library"} // Pass isActive prop
              requiresAuth
              isCollapsed={isCollapsed}
              onAuthRequired={handleAuthRequired}
            />
             {/* Ensure all NavItem instances have isCollapsed and isActive props */}
             {/* Example for an additional NavItem if needed: */}
             {/* <NavItem to="/settings" icon={Settings} label={t("settings")} isActive={location.pathname === "/settings"} isCollapsed={isCollapsed} /> */}

          </div>
        </nav>

        <div className={`flex-shrink-0 ${isCollapsed ? "px-2" : "px-4"} pb-6`}>
          <div className="space-y-4">
            <div
              className="border-t w-full transition-colors duration-200"
              style={{ borderColor: 'var(--ui-border-subtle)' }}
            >
            </div>
            {/* Signed-in: plans (free)/settings/help + account card. Guests: same + sign-in card. */}
            {session
              ? <SidebarUserSection session={session} isPro={isPro} subLoading={subLoading} isCollapsed={isCollapsed} />
              : <SidebarGuestSection isCollapsed={isCollapsed} onSignInClick={handleSignInClick} />}
          </div>
        </div>
      </aside>


 {createPortal(
        <SignInModal
          isOpen={showSignInModal}
          currentLanguage={currentLanguage}
          onClose={handleCloseSignInModal}
        />,
        document.body
      )}
    </>
  );
}
