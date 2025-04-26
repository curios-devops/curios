import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { logger } from './utils/logger';
import Sidebar from './components/Sidebar';
import { ThemeProvider } from './components/theme/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  return (
    <LanguageProvider>
      <ThemeProvider>
        <div className="flex min-h-screen bg-white dark:bg-[#111111] text-gray-900 dark:text-white transition-colors duration-200">
          <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
          <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-56'}`}>
            <Outlet />
          </main>
        </div>
      </ThemeProvider>
    </LanguageProvider>
  );
}