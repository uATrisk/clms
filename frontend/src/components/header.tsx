import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';
import { LogOut, User as UserIcon, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Header = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <header className="w-full bg-white border-b border-cream-200 py-3 px-4 sm:px-8 flex items-center justify-between shadow-xs">
      <Link to="/" className="flex items-center gap-2 font-serif font-bold text-gray-900 text-lg">
        <span className="text-maroon-700">🧺</span> CLMS
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-10 h-10 rounded-full bg-maroon-50 text-maroon-800 border border-maroon-200 flex items-center justify-center font-serif font-bold text-sm hover:bg-maroon-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-maroon-700 focus:ring-offset-2 cursor-pointer shadow-sm"
              aria-expanded={isOpen}
              aria-label="User Menu"
            >
              {user.name ? user.name[0].toUpperCase() : <UserIcon className="w-5 h-5" />}
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-cream-200 py-1.5 z-50 animate-fade-in origin-top-right">
                <div className="px-4 py-3">
                  <p className="text-sm font-serif font-semibold text-gray-900 truncate">{user.name}</p>
                  {user.bagNumber && (
                    <p className="text-xs text-maroon-700 font-medium truncate mt-0.5">
                      Bag #{user.bagNumber}
                    </p>
                  )}
                </div>

                <div className="h-px bg-cream-200 my-1"></div>

                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-cream-100 hover:text-maroon-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-maroon-600" />
                  Profile
                </Link>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="text-xs font-semibold bg-maroon-700 text-white px-4 py-2 rounded-lg hover:bg-maroon-800 transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
