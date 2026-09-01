import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token) {
    // Redirect to /login, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (
    location.pathname !== '/profile' &&
    (!user?.bagNumber || !user?.mobileNumber)
  ) {
    return <Navigate to="/profile" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
