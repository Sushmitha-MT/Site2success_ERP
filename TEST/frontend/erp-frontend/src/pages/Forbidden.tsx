import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

const Forbidden: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FEF3C7]/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-amber-900/5 p-10 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl mb-6 flex items-center justify-center mx-auto">
          <ShieldOff className="text-red-500" size={32} />
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Access Denied</h1>
        <p className="text-neutral-500 mb-8">
          You don't have permission to view this page. Contact your administrator if you believe this is a mistake.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98]"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Forbidden;
