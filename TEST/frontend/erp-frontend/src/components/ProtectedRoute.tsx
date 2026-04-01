import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  unauthorizedRedirect?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  unauthorizedRedirect = '/403',
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show spinner while session is being restored
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // No token or user → redirect to login
  if (!localStorage.getItem('erp_token') || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check → redirect to unauthorizedRedirect (defaults to /403)
  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(user.role?.toLowerCase() as string)) {
    return <Navigate to={unauthorizedRedirect} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
