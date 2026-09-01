import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import {
  Shield,
  Menu,
  X,
  User as UserIcon,
  Settings,
  LogOut,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        avatarDropdownRef.current &&
        !avatarDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAvatarOpen(false);
      }
    };
    if (isAvatarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAvatarOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAvatarOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'My Laundry', path: '/track' },
    { name: 'History', path: '/history' },
    { name: 'Help Center', path: '/help' },
    { name: 'Announcements', path: '/announcements' },
  ];

  return (
    <div className="min-h-screen bg-[#FDF8F3] text-gray-800 flex flex-col font-sans antialiased selection:bg-maroon-200 selection:text-maroon-900">
      {/* Top University Brand Bar */}
      <header className="sticky top-0 z-40 bg-[#7A1E2B] text-white shadow-md border-b border-maroon-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Left: Brand / Crest & Wordmark */}
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-200 rounded-lg p-1"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-maroon-900/60 border border-amber-300/30 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5 text-amber-200" />
                </div>
                <div className="flex flex-col">
                  <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-cream-50 leading-tight group-hover:text-amber-200 transition-colors">
                    College Laundry
                  </span>
                  <span className="text-[10px] tracking-wider uppercase text-amber-200/80 font-medium hidden sm:inline-block">
                    Management System
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `px-3.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white/15 text-amber-200 font-semibold shadow-xs'
                        : 'text-cream-100/90 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </nav>

            {/* Right: User Avatar Dropdown & Mobile Menu Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <div className="relative" ref={avatarDropdownRef}>
                  <button
                    onClick={() => setIsAvatarOpen(!isAvatarOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-amber-300/50 transition-all focus:outline-none cursor-pointer"
                    aria-expanded={isAvatarOpen}
                    aria-label="User Menu"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-cream-100 text-maroon-800 border-2 border-amber-300/40 flex items-center justify-center font-serif font-bold text-sm sm:text-base shadow-sm hover:scale-105 transition-transform">
                      {user.name ? user.name[0].toUpperCase() : <UserIcon className="w-5 h-5" />}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isAvatarOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-maroon-100 py-2 z-50 animate-fade-in origin-top-right text-gray-800">
                      <div className="px-4 py-3 bg-gradient-to-b from-cream-100/60 to-transparent border-b border-cream-200/60">
                        <p className="text-sm font-semibold text-gray-900 truncate font-serif">
                          {user.name}
                        </p>
                        <p className="text-xs text-maroon-700 font-medium truncate mt-0.5 flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {user.bagNumber ? `Bag #${user.bagNumber}` : user.email}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setIsAvatarOpen(false)}
                          className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-cream-100 hover:text-maroon-800 flex items-center gap-2.5 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-maroon-600" />
                          <span>Profile Settings</span>
                        </Link>

                        <Link
                          to="/track"
                          onClick={() => setIsAvatarOpen(false)}
                          className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-cream-100 hover:text-maroon-800 flex items-center gap-2.5 transition-colors"
                        >
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          <span>Active Laundry</span>
                        </Link>

                        <div className="h-px bg-cream-200/80 my-1"></div>

                        <button
                          onClick={() => {
                            setIsAvatarOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-maroon-950 px-4 py-2 rounded-xl transition shadow-sm"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile Hamburger Toggle Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-cream-100 hover:text-white hover:bg-white/10 rounded-lg focus:outline-none transition cursor-pointer"
                aria-label="Toggle Mobile Menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-maroon-800 border-t border-maroon-700/80 px-4 pt-2 pb-4 space-y-1 shadow-lg animate-fade-in">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `block px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-maroon-900/80 text-amber-200 font-semibold'
                      : 'text-cream-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* Main App Page Slot */}
      <main className="flex-1 flex flex-col">
        {children || <Outlet />}
      </main>

      {/* Campus Footer Note */}
      <footer className="bg-cream-100 border-t border-cream-200 py-4 px-4 text-center text-xs text-gray-500">
        <p className="font-serif font-medium text-maroon-900">
          College Laundry Management System
        </p>
        <p className="mt-0.5 text-[11px] text-gray-400">
          Seamless, reliable, and trackable laundry care for campus residents.
        </p>
      </footer>
    </div>
  );
};

export default AppShell;
