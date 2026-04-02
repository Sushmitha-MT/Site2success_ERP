import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, Mail, AlertCircle } from 'lucide-react';
import logo from '../assets/erp_logo.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Your account is inactive. Contact admin.');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left side: branding & gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>

        <div className="relative z-10 text-white max-w-lg">
          <div className="mb-12">
            <h1 className="text-7xl font-black text-white tracking-tighter leading-none uppercase">
              S2S ERP
            </h1>
          </div>
          <p className="text-xl text-orange-50 font-medium leading-relaxed opacity-90">
            Professional Management for Modern Teams.
            Streamline your workflow with real-time data and advanced RBAC security.
          </p>
          <div className="mt-12 flex gap-4">
            <div className="w-12 h-1.5 rounded-full bg-white text-orange-500"></div>
            <div className="w-12 h-1.5 rounded-full bg-white/20"></div>
            <div className="w-12 h-1.5 rounded-full bg-white/20"></div>
          </div>
        </div>
      </div>

      {/* Right side: login card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-neutral-50 lg:bg-white text-neutral-900 border-none">
        <div className="w-full max-w-md">
          <div className="bg-white lg:bg-transparent p-8 sm:p-10 rounded-3xl lg:rounded-none shadow-2xl lg:shadow-none border border-neutral-100 lg:border-none">
            {/* Logo */}
            <div className="flex justify-center mb-10">
              <img src={logo} alt="S2S Logo" className="w-[120px] object-contain" />
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Welcome Back</h2>
              <p className="text-neutral-500 mt-2 font-medium">Please enter your credentials to continue</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-sm font-semibold animate-shake">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 ml-1">Full Name or Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium"
                    placeholder="admin@erp.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <LogIn size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-12 text-center text-neutral-400 text-sm font-medium">
            &copy; {new Date().getFullYear()} S2S Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
