import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStaffAuth } from '../contexts/staff-auth-context';

export const StaffProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { staffToken } = useStaffAuth();
  const location = useLocation();

  if (!staffToken) {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
