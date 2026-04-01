import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatRole } from '../../utils/roles';

const Navbar: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="h-20 bg-white border-b border-neutral-100 sticky top-0 z-40 flex items-center justify-between px-10 shadow-sm">
      {/* Page context — breadcrumb area */}
      <div className="flex items-center gap-3 text-[13px]">
        <span className="font-bold text-neutral-400 uppercase tracking-widest">S2S Technologies</span>
        <span className="text-neutral-300">/</span>
        <span className="font-semibold text-neutral-900 tracking-tight">ERP System</span>
      </div>

      {/* Right section: user profile */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 group cursor-pointer transition-opacity hover:opacity-80">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-neutral-900 leading-none mb-1">
              {user?.full_name || 'Admin User'}
            </p>
            <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">{formatRole(user?.role)}</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-200 shadow-sm font-black text-lg transition-transform group-hover:scale-105">
            {(user?.full_name || user?.email || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
