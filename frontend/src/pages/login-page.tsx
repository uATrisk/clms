import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../contexts/auth-context';
import { AlertCircle } from 'lucide-react';
import { CampusFooter } from '../components/campus-footer';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Where to redirect after successful login
  const from = (location.state as any)?.from?.pathname || '/';

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    setIsLoading(true);
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      const response = await axios.post(`${API_BASE_URL}/auth/google`, {
        id_token: credentialResponse.credential,
      });

      const { token, user } = response.data;
      login(token, user);
      if (!user.bagNumber || !user.mobileNumber) {
        navigate('/profile', { state: { from: { pathname: from } }, replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Authentication failed. Make sure to use your @rishihood.edu.in account.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="flex-1 bg-cream-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-cream-50 rounded-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center flex flex-col items-center mb-6">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900">Student Sign In</h1>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-600 text-center mb-6">
              Sign in with your official university Google account (
              <span className="font-semibold text-gray-800">@rishihood.edu.in</span>
              ) to submit and track your laundry orders.
            </p>

            {error && (
              <div className="w-full mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!clientId ? (
              <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                <p className="font-semibold mb-1">Google OAuth Client ID Missing</p>
                <p>
                  Please configure <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code> in <code className="bg-amber-100 px-1 py-0.5 rounded">frontend/.env</code>.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full min-h-[50px]">
                {isLoading ? (
                  <div className="text-sm text-gray-500 animate-pulse">
                    Authenticating with server...
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      setError('Google Sign-In encountered an error or was closed.');
                    }}
                    useOneTap
                    theme="outline"
                    shape="pill"
                    size="large"
                  />
                )}
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-cream-200 w-full text-center">
              <Link
                to="/"
                className="text-sm text-maroon-700 hover:text-maroon-900 font-medium"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
      <CampusFooter />
    </div>
  );
}
