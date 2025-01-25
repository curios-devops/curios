import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Results from './pages/Results';
import ProResults from './pages/ProResults';
import Settings from './pages/Settings';
import Policies from './pages/Policies';
import AuthCallback from './components/auth/AuthCallback';

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-black">
        <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
        <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-56'}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Results />} />
            <Route path="/pro-search" element={<ProResults />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}