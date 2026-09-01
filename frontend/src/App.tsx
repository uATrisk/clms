import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { AuthProvider, useAuth } from './contexts/auth-context';
import { StaffAuthProvider } from './contexts/staff-auth-context';
import { ProtectedRoute } from './components/protected-route';
import { StaffProtectedRoute } from './components/staff-protected-route';
import { AdminProtectedRoute } from './components/admin-protected-route';
import { Header } from './components/header';

import LandingPage from './pages/landing-page';
import DashboardPage from './pages/dashboard-page';
import TrackPage from './pages/track-page';
import TrackSearchPage from './pages/track-search-page';
import TrackDetailsPage from './pages/track-details-page';
import SubmitPage from './pages/submit-page';
import ProfilePage from './pages/profile-page';
import HistoryPage from './pages/history-page';
import LoginPage from './pages/login-page';
import StaffLoginPage from './pages/staff-login-page';
import StaffOrdersPage from './pages/staff-orders-page';
import StaffCollectionPage from './pages/staff-collection-page';
import AdminLoginPage from './pages/admin-login-page';
import AdminDashboardPage from './pages/admin-dashboard-page';

const queryClient = new QueryClient();

function HomeRoute() {
  const { token } = useAuth();
  if (token) {
    return (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    );
  }
  return <LandingPage />;
}

function MainContent() {
  const location = useLocation();
  const { token } = useAuth();
  const isStaffRoute = location.pathname.startsWith('/staff') || location.pathname.startsWith('/admin');
  const isStudentDashboard = location.pathname === '/' && !!token;

  return (
    <div className="flex flex-col min-h-screen">
      {!isStaffRoute && !isStudentDashboard && <Header />}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<HomeRoute />} />
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
            path="/track/search"
            element={
              <ProtectedRoute>
                <TrackSearchPage />
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
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
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
          <Route
            path="/staff/collection"
            element={
              <StaffProtectedRoute>
                <StaffCollectionPage />
              </StaffProtectedRoute>
            }
          />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminDashboardPage />
              </AdminProtectedRoute>
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
