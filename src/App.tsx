import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { logger } from './utils/logger.ts';
import { ThemeProvider } from './components/theme/ThemeContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import Sidebar from './components/Sidebar.tsx';
import Logo from './components/sidebar/Logo.tsx';
import { Menu } from 'lucide-react';
import ThemeToggle from './components/theme/ThemeToggle.tsx';
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
    return (
      <button
        className="h-7 px-3 rounded-full flex items-center justify-center text-sm font-medium text-white transition-colors shadow-md"
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

  function MobileContinueEmail() {
    const accent = useAccentColor();
    return (
      <button
        type="button"
        className="w-full py-2 px-4 text-white rounded-md transition-colors"
        style={{ backgroundColor: accent.primary }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = accent.hover }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = accent.primary }}
      >
        Continue with email
      </button>
    );
  }

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
            {/* Mobile Sign Up Modal */}
            {showSignUpModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sign up to CuriosAI</h2>
                    <button 
                      type="button"
                      onClick={() => setShowSignUpModal(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">Create an account to save your searches and access premium features.</p>
                  <div className="flex flex-col gap-3">
                    <MobileContinueEmail />
                    <button type="button" className="w-full py-2 px-4 bg-white dark:bg-[#222222] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-md flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#333333] transition-colors">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        <main className={`flex-1 transition-all duration-300 ${!isMobilePortrait && (isCollapsed ? 'ml-20' : 'ml-48')}`} style={isMobilePortrait ? { marginTop: 56 } : {}}>
          {/* @ts-ignore: React Router Outlet type issue in strict TypeScript */}
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