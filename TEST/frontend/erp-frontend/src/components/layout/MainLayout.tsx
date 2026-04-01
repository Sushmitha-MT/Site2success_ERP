import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ChatWidget from '../ChatWidget';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const isProjectPage = location.pathname.includes('/projects/');

  return (
    <div className="flex min-h-screen bg-white text-neutral-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="p-8 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      {/* Floating chat widget — hidden on project-specific pages to avoid overlap with collaborate chat */}
      {!isProjectPage && <ChatWidget />}
    </div>
  );
};

export default MainLayout;
