import { useAuth } from '../contexts/auth-context';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="w-full bg-white border-b border-gray-100 py-3 px-4 sm:px-8 flex items-center justify-between shadow-xs">
      <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg">
        <span className="text-blue-600">🧺</span> CLMS
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-gray-900">{user.name}</p>
              <p className="text-[11px] text-gray-500">{user.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              {user.name ? user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
