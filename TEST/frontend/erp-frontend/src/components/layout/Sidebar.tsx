import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/erp_logo.png';
import {
  LayoutDashboard,
  Briefcase,
  DollarSign,
  LogOut,
  Clock,
  UsersRound,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isFinanceRole, isTeamLead } from '../../utils/roles';

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const role = user?.role;

  const allMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', visible: true },
    { icon: Briefcase, label: 'Projects', path: '/projects', visible: true },
    { icon: CheckSquare, label: 'Task Board', path: '/tasks', visible: true },
    { icon: DollarSign, label: 'Finance', path: '/finance', visible: isFinanceRole(role) },
    { icon: Clock, label: 'My Attendance', path: '/attendance/my', visible: !['super_admin', 'admin'].includes(role ?? '') },
    { icon: UsersRound, label: 'Team Attendance', path: '/attendance/team', visible: isTeamLead(role) },
  ];

  const menuItems = allMenuItems.filter((item) => item.visible);

  const isActive = (path: string) =>
    path === '/projects'
      ? location.pathname === '/projects' || location.pathname.startsWith('/projects/')
      : location.pathname === path;

  return (
    <aside className="w-64 bg-white border-r border-neutral-100 flex flex-col h-screen sticky top-0 z-50">
      {/* Logo Header */}
      <div className="p-8 pb-4">
        <Link to="/dashboard" className="flex items-center gap-4 group">
          <img src={logo} alt="S2S Logo" className="w-10 h-10 object-contain hover:scale-110 transition-transform duration-300" />
          <span className="text-2xl font-black text-neutral-900 tracking-tight">S2S ERP</span>
        </Link>
      </div>

      {/* User profile minimal box */}
      {user && (
        <div className="px-6 py-4 mb-4">
          <div className="px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-100">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Signed in as</p>
            <p className="text-sm font-bold text-neutral-900 truncate">{user.full_name || 'Admin User'}</p>
            <p className="text-[10px] text-orange-500 font-black uppercase tracking-wider mt-1 underline decoration-orange-500/30 underline-offset-2">
              {(user.role ?? '').replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group text-sm font-semibold relative overflow-hidden mx-2',
                active
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-neutral-500 hover:text-orange-500 hover:bg-orange-50/50 hover:translate-x-1'
              )}
            >
              <item.icon
                size={20}
                className={cn('transition-colors duration-300', active ? 'text-orange-500' : 'text-neutral-400 group-hover:text-orange-500')}
              />
              <span>{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout at bottom */}
      <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-neutral-500 hover:bg-red-50 hover:text-red-600 hover:translate-x-1 transition-all duration-300 text-sm font-bold group"
        >
          <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
