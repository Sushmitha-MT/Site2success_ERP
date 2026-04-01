import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, User } from '../api/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On app load: restore session via GET /users/me if token exists
  useEffect(() => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      getMe()
        .then((u) => setUser(u))
        .catch(() => {
          // Token invalid or expired — clear storage silently
          localStorage.removeItem('erp_token');
          localStorage.removeItem('erp_role');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const u = await apiLogin(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    apiLogout(); // clears localStorage and redirects
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await getMe();
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
