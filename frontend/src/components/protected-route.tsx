import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    // Redirect to /login, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
