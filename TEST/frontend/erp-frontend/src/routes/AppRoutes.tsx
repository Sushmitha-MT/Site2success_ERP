import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import ProjectOverview from '../pages/ProjectOverview';
import Finance from '../pages/Finance';
import Tasks from '../pages/Tasks';
import Forbidden from '../pages/Forbidden';
import Unauthorized from '../pages/Unauthorized';
import MyAttendance from '../pages/MyAttendance';
import TeamAttendance from '../pages/TeamAttendance';

// ── Removed routes: CRM (/crm), Sprints (/sprints) ──────────────────────────
// These modules are incomplete and have been hidden from navigation.
// The page components still exist but are not routed.

const AppRoutes: React.FC = () => {
  const { user } = useAuth(); // FIX: was incorrectly using `isAuthenticated` which doesn't exist

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/403" element={<Forbidden />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected app shell */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectOverview />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route
          path="/attendance/my"
          element={
            <ProtectedRoute
              allowedRoles={['employee', 'manager', 'project_manager', 'founder', 'co_founder']}
              unauthorizedRedirect="/dashboard"
            >
              <MyAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance/team"
          element={
            <ProtectedRoute
              allowedRoles={['super_admin', 'project_manager', 'manager', 'admin', 'founder', 'co_founder']}
            >
              <TeamAttendance />
            </ProtectedRoute>
          }
        />

        {/* Finance: Admin, Founder, Co-Founder, Super Admin */}
        <Route
          path="/finance"
          element={
            <ProtectedRoute
              allowedRoles={[...import.meta.env.PROD ? [] : [], 'super_admin', 'admin', 'founder', 'co_founder']}
              unauthorizedRedirect="/dashboard"
            >
              <Finance />
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Catch-all → dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
