import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { logger } from './utils/logger.ts';
import { ThemeProvider } from './components/theme/ThemeContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import Sidebar from './components/Sidebar.tsx';
import { useEffect } from 'react';
import Logo from './components/sidebar/Logo.tsx';
import { Menu } from 'lucide-react';

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    function checkMobilePortrait() {
      const isMobile = window.innerWidth <= 768;
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      setIsMobilePortrait(isMobile && isPortrait);
      if (!(isMobile && isPortrait)) setMobileSidebarOpen(false);
    }
    checkMobilePortrait();
    window.addEventListener('resize', checkMobilePortrait);
    window.addEventListener('orientationchange', checkMobilePortrait);
    return () => {
      window.removeEventListener('resize', checkMobilePortrait);
      window.removeEventListener('orientationchange', checkMobilePortrait);
    };
  }, []);

  // Configure React error handling
  React.useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      logger.error('React Console Error:', args);
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return <LanguageProvider>
    <ThemeProvider>
      <div className="flex min-h-screen bg-white dark:bg-[#111111] text-gray-900 dark:text-white transition-colors duration-200">
        {!isMobilePortrait && (
          <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
        )}
        {isMobilePortrait && (
          <>
            <header className="fixed top-0 left-0 w-full z-50 bg-white/90 dark:bg-[#111111]/90 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 py-2 gap-3 shadow-sm">
              <button className="p-2" aria-label="Open menu" onClick={() => setMobileSidebarOpen(true)}>
                <Menu size={28} className="text-gray-900 dark:text-white" />
              </button>
              <div className="flex items-center gap-2">
                <Logo isCollapsed={false} />
              </div>
            </header>
            {/* Mobile Sidebar Drawer */}
            {mobileSidebarOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
                <aside className="fixed top-0 left-0 z-50 h-full w-64 bg-[#f9f9f8] dark:bg-[#111111] border-r border-gray-200 dark:border-gray-800 shadow-lg transition-transform duration-300" style={{ transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
                  <Sidebar isCollapsed={false} toggleSidebar={() => setMobileSidebarOpen(false)} />
                </aside>
              </>
            )}
          </>
        )}
        <main className={`flex-1 transition-all duration-300 ${!isMobilePortrait && (isCollapsed ? 'ml-20' : 'ml-48')}`} style={isMobilePortrait ? { marginTop: 56 } : {}}>
          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  </LanguageProvider>;
}