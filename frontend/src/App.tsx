import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { AuthProvider } from './contexts/auth-context';
import { StaffAuthProvider } from './contexts/staff-auth-context';
import { ProtectedRoute } from './components/protected-route';
import { StaffProtectedRoute } from './components/staff-protected-route';
import { Header } from './components/header';

import LandingPage from './pages/landing-page';
import TrackPage from './pages/track-page';
import TrackDetailsPage from './pages/track-details-page';
import SubmitPage from './pages/submit-page';
import LoginPage from './pages/login-page';
import StaffLoginPage from './pages/staff-login-page';
import StaffOrdersPage from './pages/staff-orders-page';

const queryClient = new QueryClient();

function MainContent() {
  const location = useLocation();
  const isStaffRoute = location.pathname.startsWith('/staff');

  return (
    <div className="flex flex-col min-h-screen">
      {!isStaffRoute && <Header />}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/track"
            element={
              <ProtectedRoute>
                <TrackPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/track/:orderCode"
            element={
              <ProtectedRoute>
                <TrackDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/submit"
            element={
              <ProtectedRoute>
                <SubmitPage />
              </ProtectedRoute>
            }
          />
          <Route path="/staff/login" element={<StaffLoginPage />} />
          <Route
            path="/staff/orders"
            element={
              <StaffProtectedRoute>
                <StaffOrdersPage />
              </StaffProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StaffAuthProvider>
            <BrowserRouter>
              <MainContent />
            </BrowserRouter>
          </StaffAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
