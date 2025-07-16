import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar.tsx';
import { useLanguage } from './contexts/LanguageContext.tsx';
import { useState } from 'react';
export default function Layout() {
  const { currentLanguage } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false); // Initialize as not collapsed

  const toggleSidebar = () => setIsCollapsed((prev: boolean) => !prev);

  return (
    <div className="flex h-screen relative overflow-x-hidden" lang={currentLanguage.code}> {/* Added relative for potential absolute positioning of mobile sidebar and overflow-x-hidden to prevent horizontal scrolling */}
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} className="w-56" /> {/* Set a fixed width */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}