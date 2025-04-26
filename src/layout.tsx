import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { useLanguage } from './contexts/LanguageContext';
import { useState } from 'react';

export default function Layout() {
  const { currentLanguage } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const toggleSidebar = () => setIsCollapsed((prev) => !prev);

  return (
    <div className="flex h-screen" lang={currentLanguage.code}>
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}