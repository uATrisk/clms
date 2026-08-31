import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStaffAuth } from '../contexts/staff-auth-context';

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { staffToken, staffUser } = useStaffAuth();
  const location = useLocation();

  if (!staffToken || !staffUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (staffUser.role !== 'ADMIN') {
    // If not an admin, redirect them back to their appropriate dashboard
    return <Navigate to="/staff/orders" replace />;
  }

  return <>{children}</>;
}
