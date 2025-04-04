import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { logger } from './utils/logger';
import Sidebar from './components/Sidebar';

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
    <div className="flex min-h-screen bg-[#111111] text-white">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-56'}`}>
        <Outlet />
      </main>
    </div>
  );
}