import { useState, useEffect, lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/theme/ThemeContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import Sidebar from './components/Sidebar.tsx';
import Logo from './components/sidebar/Logo.tsx';
import { Menu, Crown } from 'lucide-react';
import ThemeToggle from './components/theme/ThemeToggle.tsx';
import ProCreditsBattery from './components/ProCreditsBattery.tsx';
import SignUpModal from './components/auth/SignUpModal.tsx';
import { useTranslation } from './hooks/useTranslation.ts';
import { useAccentColor } from './hooks/useAccentColor.ts';
import { useTheme } from './components/theme/ThemeContext.tsx';
import PromoBanner from './components/PromoBanner.tsx';
import { ProCreditsProvider } from './providers/ProCreditsProvider.tsx';
import { useSession } from './hooks/useSession.ts';
import { useSubscription } from './hooks/useSubscription.ts';

// Lazy load ProModal to avoid loading Stripe unnecessarily
const ProModal = lazy(() => import('./components/subscription/ProModal.tsx'));

// Main App Content Component that can access translation context
function AppContent() {
  const { t } = useTranslation();
  const { session } = useSession();
  const { subscription } = useSubscription(session);
  const isPro = !!session && !!subscription?.isActive;
  const isStandard = !!session && !subscription?.isActive; // Logged in but not pro
  const isHome = useLocation().pathname === '/'; // Promo banner only shows on home
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

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
      // Do NOT call logger.error here: logger.error calls console.error,
      // which is this patched function — infinite mutual recursion that hangs the app.
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
    const { theme, accentColor: selectedAccentColor } = useTheme();
    const isGrayAccent = selectedAccentColor === 'gray';
    const isDarkMode =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const backgroundColor = isGrayAccent
      ? isDarkMode
        ? '#F3F4F6'
        : '#111827'
      : accent.primary;

    const textColor = isGrayAccent
      ? isDarkMode
        ? '#111827'
        : '#F3F4F6'
      : 'var(--ui-text-on-accent)';

    const hoverBackgroundColor = isGrayAccent
      ? isDarkMode
        ? '#E5E7EB'
        : '#1F2937'
      : accent.hover;

    // Pro users already started — show a Pro badge instead of "Get started"
    if (isPro) {
      return (
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center shadow-md"
          style={{ backgroundColor: accent.primary, color: 'var(--ui-text-on-accent)' }}
          title={t('premiumActive') || 'Premium Subscription Active'}
        >
          <Crown size={15} />
        </div>
      );
    }

    // Logged-in non-pro users already started — offer Upgrade instead of "Get started"
    if (isStandard) {
      return (
        <button
          className="h-7 px-3 rounded-lg flex items-center justify-center text-sm font-medium text-white transition-colors shadow-md"
          type="button"
          onClick={() => setShowProModal(true)}
          style={{ backgroundColor, color: textColor, border: '1px solid transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBackgroundColor }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = backgroundColor;
            e.currentTarget.style.color = textColor;
          }}
        >
          {t('upgrade') || 'Upgrade'}
        </button>
      );
    }

    // Use the same visual style as the desktop "Get started" button (rounded-lg)
    return (
      <button
        className="h-7 px-3 rounded-lg flex items-center justify-center text-sm font-medium text-white transition-colors shadow-md"
        type="button"
        onClick={() => setShowSignUpModal(true)}
        style={{
          backgroundColor,
          color: textColor,
          border: isGrayAccent ? '1px solid transparent' : '1px solid transparent',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBackgroundColor }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = backgroundColor;
          e.currentTarget.style.color = textColor;
        }}
      >
        {t('getStarted')}
      </button>
    );
  }

  // removed unused MobileContinueEmail helper

  return (
      <div className="flex flex-col min-h-screen transition-colors duration-200" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        {isHome && <PromoBanner />}
        {/* Pro upgrade modal triggered by mobile top-bar Upgrade button (lazy loaded) */}
        {showProModal && (
          <Suspense fallback={null}>
            <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
          </Suspense>
        )}
        <div className="flex flex-1">
          {!isMobilePortrait && (
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
          )}
          {isMobilePortrait && (
            <>
              <header className="fixed top-0 left-0 w-full z-50 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 py-2 gap-3 shadow-sm" style={{ marginTop: isHome ? '32px' : '0', backgroundColor: 'var(--background)' }}>
                <div className="flex items-center gap-3">
                  <button type="button" className="p-2" aria-label="Open menu" onClick={() => setMobileSidebarOpen(true)}>
                    <Menu size={28} className="text-gray-900 dark:text-white" />
                  </button>
                  <div className="flex items-center gap-2">
                    <Logo isCollapsed={false} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ProCreditsBattery />
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
          <main className={`flex-1 min-w-0 transition-all duration-300 ${!isMobilePortrait && (isCollapsed ? 'ml-20' : 'ml-48')}`} style={isMobilePortrait ? { marginTop: isHome ? 88 : 56 } : {}}>
            <Outlet />
          </main>
        </div>
      </div>
  );
}
export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ProCreditsProvider>
          <AppContent />
        </ProCreditsProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}