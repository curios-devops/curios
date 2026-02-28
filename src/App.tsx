import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { logger } from './utils/logger.ts';
import { ThemeProvider } from './components/theme/ThemeContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import Sidebar from './components/Sidebar.tsx';
import Logo from './components/sidebar/Logo.tsx';
import { Menu } from 'lucide-react';
import ThemeToggle from './components/theme/ThemeToggle.tsx';
import SignUpModal from './components/auth/SignUpModal.tsx';
import { useTranslation } from './hooks/useTranslation.ts';
import { useAccentColor } from './hooks/useAccentColor.ts';

// Main App Content Component that can access translation context
function AppContent() {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  useEffect(() => {
    function checkMobilePortrait() {
      const isMobile = globalThis.innerWidth <= 768;
      const isPortrait = globalThis.matchMedia('(orientation: portrait)').matches;
      setIsMobilePortrait(isMobile && isPortrait);
      if (!(isMobile && isPortrait)) setMobileSidebarOpen(false);
    }
    checkMobilePortrait();
    globalThis.addEventListener('resize', checkMobilePortrait);
    globalThis.addEventListener('orientationchange', checkMobilePortrait);
    return () => {
      globalThis.removeEventListener('resize', checkMobilePortrait);
      globalThis.removeEventListener('orientationchange', checkMobilePortrait);
    };
  }, []);

  // Configure React error handling and suppress non-critical warnings
  useEffect(() => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args) => {
      const message = args.join(' ');
      // Suppress non-critical errors
      if (message.includes('Cannot find module') || 
          message.includes('clock for skew') ||
          message.includes('issued in the future')) {
        return; // Silently ignore
      }
      logger.error('React Console Error:', args);
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      // Suppress Supabase clock skew and Stripe locale warnings
      if (message.includes('@supabase/gotrue-js') && message.includes('clock for skew')) {
        return; // Silently ignore
      }
      if (message.includes('preload') && message.includes('unsupported')) {
        return; // Silently ignore
      }
      originalConsoleWarn.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Mobile Get Started component so it can access AppContent scope (t, state)
  function MobileGetStarted() {
    const accent = useAccentColor();
    // Use the same visual style as the desktop "Get started" button (rounded-lg)
    return (
      <button
        className="h-7 px-3 rounded-lg flex items-center justify-center text-sm font-medium text-white transition-colors shadow-md"
        type="button"
        onClick={() => setShowSignUpModal(true)}
        style={{ backgroundColor: accent.primary }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accent.hover }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = accent.primary }}
      >
        {t('getStarted')}
      </button>
    );
  }

  // removed unused MobileContinueEmail helper

  return (
      <div className="flex min-h-screen bg-white dark:bg-[#111111] text-gray-900 dark:text-white transition-colors duration-200">
        {!isMobilePortrait && (
          <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
        )}
        {isMobilePortrait && (
          <>
            <header className="fixed top-0 left-0 w-full z-50 bg-white/90 dark:bg-[#111111]/90 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 py-2 gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <button type="button" className="p-2" aria-label="Open menu" onClick={() => setMobileSidebarOpen(true)}>
                  <Menu size={28} className="text-gray-900 dark:text-white" />
                </button>
                <div className="flex items-center gap-2">
                  <Logo isCollapsed={false} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <MobileGetStarted />
              </div>
            </header>
            {/* Mobile Sidebar Drawer */}
            {mobileSidebarOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
                <aside className="fixed top-0 left-0 z-50 h-full w-48 shadow-lg transition-transform duration-300" style={{ transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
                  <Sidebar embedded isCollapsed={false} toggleSidebar={() => setMobileSidebarOpen(false)} />
                </aside>
              </>
            )}
            {/* Mobile Sign Up Modal - reuse shared SignUpModal component so desktop and mobile behave the same */}
            {showSignUpModal && (
              <SignUpModal
                isOpen={showSignUpModal}
                onClose={() => setShowSignUpModal(false)}
              />
            )}
          </>
        )}
        <main className={`flex-1 transition-all duration-300 ${!isMobilePortrait && (isCollapsed ? 'ml-20' : 'ml-48')}`} style={isMobilePortrait ? { marginTop: 56 } : {}}>
          <Outlet />
        </main>
      </div>
  );
}
export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}