import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { useStaffAuth } from '../contexts/staff-auth-context';
import { AlertCircle, Loader2, Lock, User, Eye, EyeOff } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function StaffLoginPage() {
  const { staffLogin } = useStaffAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/staff/orders';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: username.trim(),
        password: password.trim(),
      });

      const { token, user } = response.data;
      staffLogin(token, user);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Staff login error:', err);
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Authentication failed. Please check your credentials.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-cream-200 p-6 sm:p-8">
        {/* Header */}
        <div className="text-center flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Rishihood Laundry" className="h-14 w-auto object-contain mb-4" />
          <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900">Staff Portal Login</h1>
        </div>

        {/* Content */}
        <div>
          {error && (
            <div className="w-full mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin_warden"
                  disabled={isLoading}
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2.5 border border-cream-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-maroon-700 focus:border-maroon-700 outline-none transition-all disabled:bg-cream-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 border border-cream-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-maroon-700 focus:border-maroon-700 outline-none transition-all disabled:bg-cream-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-maroon-700 focus:outline-none transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-maroon-700 text-white font-semibold py-2.5 rounded-lg hover:bg-maroon-800 transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In to Staff Portal'
              )}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-cream-200 w-full text-center">
            <Link
              to="/"
              className="text-xs text-gray-500 hover:text-maroon-800 font-medium"
            >
              ← Back to Student Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
