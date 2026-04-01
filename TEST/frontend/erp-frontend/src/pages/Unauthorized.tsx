import React from 'react';
import { ShieldAlert, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-8 border border-red-200 shadow-xl shadow-red-500/5">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-4xl font-black text-neutral-900 mb-4">Access Denied</h1>
        <p className="text-neutral-500 mb-10 leading-relaxed text-lg">
          You don't have the necessary clearance to view this module. Please contact your administrator or return to the dashboard.
        </p>
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-amber-500/25 transition-all active:scale-95"
        >
          <Home size={20} />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
