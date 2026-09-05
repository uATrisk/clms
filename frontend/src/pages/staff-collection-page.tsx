import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useStaffAuth } from '../contexts/staff-auth-context';
import {
  SEARCH_FILTER_OPTIONS,
  getSearchPlaceholder,
  filterOrders,
} from '../utils/search-utils';
import type { SearchFilterType } from '../utils/search-utils';
import {
  Search,
  LogOut,
  PackageCheck,
  AlertCircle,
  Clock,
  User,
  X,
  Sparkles,
  ShoppingBag,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

type ReadyOrder = {
  id: string;
  orderCode: string;
  bagNumber: string;
  status: string;
  actualReadyAt?: string;
  collectionOtpPlain?: string;
  student?: {
    name?: string;
    email?: string;
  };
};

export default function StaffCollectionPage() {
  const { staffToken, staffUser, staffLogout } = useStaffAuth();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<SearchFilterType>('all');
  const [allOrders, setAllOrders] = useState<ReadyOrder[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target as Node)) {
        setIsAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Collect Modal State
  const [collectModalOrder, setCollectModalOrder] = useState<ReadyOrder | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [isAdminOverride, setIsAdminOverride] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isSubmittingCollect, setIsSubmittingCollect] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Success / Global Notification Banner
  const [notificationBanner, setNotificationBanner] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const fetchOrders = async (query = '') => {
    setSearchError(null);
    setIsSearching(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/staff/orders/search`, {
        params: query ? { q: query } : {},
        headers: { Authorization: `Bearer ${staffToken}` },
      });

      const orders = response.data?.orders || [];
      setAllOrders(orders);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to fetch ready orders. Please try again.';
      setSearchError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (staffToken) {
      fetchOrders();
    }
  }, [staffToken]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setNotificationBanner(null);
    // Refresh the full list to ensure we have the latest orders,
    // since we use robust client-side filtering that handles prefix parsing better than the backend.
    await fetchOrders();
  };

  const handleOpenCollectModal = (order: ReadyOrder) => {
    setCollectModalOrder(order);
    setOtpInput(order.collectionOtpPlain || '');
    setAdminPinInput('');
    setIsAdminOverride(false);
    setModalError(null);
  };

  const handleCloseCollectModal = () => {
    if (isSubmittingCollect) return;
    setCollectModalOrder(null);
    setOtpInput('');
    setAdminPinInput('');
    setIsAdminOverride(false);
    setModalError(null);
  };

  const handleSubmitCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectModalOrder) return;

    const payload: { otp?: string; adminPin?: string } = {};

    if (isAdminOverride) {
      const trimmedPin = adminPinInput.trim();
      if (!trimmedPin) {
        setModalError('Please enter the Admin PIN for manual override.');
        return;
      }
      payload.adminPin = trimmedPin;
    } else {
      const trimmedOtp = otpInput.trim();
      if (!trimmedOtp) {
        setModalError('Please enter the 4-digit collection OTP provided by the student.');
        return;
      }
      payload.otp = trimmedOtp;
    }

    setModalError(null);
    setIsSubmittingCollect(true);

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/staff/orders/${collectModalOrder.id}/collect`,
        payload,
        {
          headers: { Authorization: `Bearer ${staffToken}` },
        }
      );

      const collectedOrder = response.data?.order;
      const orderCode = collectedOrder?.orderCode || collectModalOrder.orderCode;

      // Remove the collected order from current search results
      setAllOrders((prev) => prev.filter((o) => o.id !== collectModalOrder.id));

      // Close modal
      setCollectModalOrder(null);

      // Show success notification banner
      setNotificationBanner({
        type: 'success',
        title: 'Laundry Handover Completed',
        message: isAdminOverride
          ? `Order ${orderCode} was collected via ADMIN PIN OVERRIDE and marked as COLLECTED.`
          : `Order ${orderCode} has been successfully verified and marked as COLLECTED.`,
      });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setModalError(isAdminOverride ? 'Invalid Admin PIN. Please try again.' : 'Invalid OTP, please try again.');
      } else {
        const errorMsg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to verify and collect order. Please check the details and try again.';
        setModalError(errorMsg);
      }
    } finally {
      setIsSubmittingCollect(false);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const filteredOrders = filterOrders(allOrders, searchQuery, filterType);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col font-sans">
      {/* Staff Top Navigation */}
      <header className="bg-maroon-700 text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
        <Link
          to="/staff/collection"
          className="flex items-center group focus:outline-none"
        >
          <div className="bg-white rounded-xl p-1.5 flex items-center shadow-sm">
            <img src="/logo.png" alt="Rishihood Laundry" className="h-7 w-auto object-contain hidden sm:block" />
            <img src="/icon.png" alt="Rishihood Laundry" className="h-7 w-auto object-contain sm:hidden" />
          </div>
        </Link>

        {/* View Switcher Tabs */}
        <div className="hidden md:flex items-center gap-1.5 bg-maroon-800/80 p-1 rounded-xl border border-maroon-700/60">
          {staffUser?.role === 'ADMIN' && (
            <Link
              to="/admin/dashboard"
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                location.pathname === '/admin/dashboard'
                  ? 'bg-maroon-700 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-maroon-700/50'
              }`}
            >
              Admin Portal
            </Link>
          )}
          <Link
            to="/staff/orders"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              location.pathname === '/staff/orders'
                ? 'bg-maroon-700 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-maroon-700/50'
            }`}
          >
            Washer Queue
          </Link>
          <Link
            to="/staff/collection"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              location.pathname === '/staff/collection'
                ? 'bg-maroon-700 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-maroon-700/50'
            }`}
          >
            Collection Desk
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative" ref={avatarDropdownRef}>
            <button
              onClick={() => setIsAvatarOpen(!isAvatarOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-amber-300/50 transition-all focus:outline-none cursor-pointer"
              aria-expanded={isAvatarOpen}
              aria-label="User Menu"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-cream-100 text-maroon-800 border-2 border-amber-300/40 flex items-center justify-center font-serif font-bold text-sm sm:text-base shadow-sm hover:scale-105 transition-transform">
                {staffUser?.name ? staffUser.name[0].toUpperCase() : <User className="w-5 h-5" />}
              </div>
            </button>

            {/* Dropdown Menu */}
            {isAvatarOpen && (
              <div className="absolute right-0 mt-2 w-56 sm:w-60 bg-white rounded-2xl shadow-2xl border border-maroon-100 py-2 z-50 animate-fade-in origin-top-right text-gray-800">
                <div className="px-4 py-3 bg-gradient-to-b from-cream-100/60 to-transparent border-b border-cream-200/60">
                  <p className="text-sm font-semibold text-gray-900 truncate font-serif">
                    {staffUser?.name || staffUser?.username}
                  </p>
                  <div className="mt-1">
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-maroon-700 bg-maroon-50 border border-maroon-200 px-2 py-0.5 rounded-md inline-block">
                      {staffUser?.role}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsAvatarOpen(false);
                      staffLogout();
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
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden bg-maroon-800 border-b border-maroon-700 px-4 py-2 flex items-center justify-center gap-2">
        <Link
          to="/staff/orders"
          className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition ${
            location.pathname === '/staff/orders'
              ? 'bg-maroon-700 text-white shadow-xs'
              : 'text-slate-300 hover:bg-maroon-700'
          }`}
        >
          Washer Queue
        </Link>
        <Link
          to="/staff/collection"
          className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition ${
            location.pathname === '/staff/collection'
              ? 'bg-maroon-700 text-white shadow-xs'
              : 'text-slate-300 hover:bg-maroon-700'
          }`}
        >
          Collection Desk
        </Link>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Flash Notification Banner */}
        {notificationBanner && notificationBanner.type !== 'success' && (
          <div
            className="mb-6 p-4 rounded-xl border flex items-start justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 bg-red-50 border-red-200 text-red-900"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{notificationBanner.title}</h3>
                <p className="text-xs mt-0.5 opacity-90">{notificationBanner.message}</p>
              </div>
            </div>
            <button
              onClick={() => setNotificationBanner(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Card */}
        <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-4 sm:p-6 mb-6">
          <div className="mb-3">
            <h2 className="font-serif text-base sm:text-lg font-bold text-slate-900">
              Lookup Ready Orders
            </h2>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getSearchPlaceholder(filterType)}
                className="w-full pl-10 pr-9 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 text-slate-900 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as SearchFilterType)}
                className="flex-1 sm:flex-none bg-cream-50 border border-cream-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 py-2.5 pl-3 pr-8 focus:outline-hidden focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 appearance-none cursor-pointer"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundPosition: "right 0.6rem center", backgroundRepeat: "no-repeat", backgroundSize: "1em 1em" }}
              >
                {SEARCH_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-2.5 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs shadow-maroon-700/10 active:scale-[0.98]"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {searchError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="flex-1">
          {isSearching && allOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-cream-200 p-8 sm:p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-maroon-700/20 border-t-maroon-700 rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium text-slate-600">Loading ready orders...</p>
            </div>
          ) : allOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-cream-200 p-8 sm:p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-base font-semibold text-slate-800">
                No Orders Ready for Collection
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1">
                There are currently no orders in <span className="font-semibold text-emerald-600">READY</span> status awaiting pickup.
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-cream-200 p-8 sm:p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-cream-100 text-slate-400 flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-sm sm:text-base font-semibold text-slate-700">
                No Matching Orders Found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1">
                No orders in <strong>READY</strong> status matched "{searchQuery}". Try adjusting your filter or search query.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {filteredOrders.length} Ready Order{filteredOrders.length === 1 ? '' : 's'} {searchQuery.trim() ? 'Matched' : 'Awaiting Collection'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-cream-200 shadow-xs hover:border-emerald-300 transition p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                          {order.orderCode}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          READY FOR PICKUP
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-cream-100 text-slate-700 border border-cream-200">
                          {order.bagNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800">
                            {order.student?.name || 'Student'}
                          </span>
                          {order.student?.email && (
                            <span className="text-slate-400 truncate">
                              ({order.student.email})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Ready since: <strong>{formatDateTime(order.actualReadyAt)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-cream-100">
                      <button
                        onClick={() => handleOpenCollectModal(order)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-maroon-700 hover:bg-maroon-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs shadow-maroon-700/10"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>Collect</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Collect / Handover Verification Modal */}
      {collectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-cream-200 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-cream-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-sm sm:text-base">
                    Handover Verification
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {collectModalOrder.orderCode} ({collectModalOrder.bagNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseCollectModal}
                disabled={isSubmittingCollect}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-cream-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCollect} className="space-y-4">
              <div className="p-3 bg-cream-50 rounded-xl border border-cream-200 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-semibold text-slate-800">
                    {collectModalOrder.student?.name || 'Student'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bag Number:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {collectModalOrder.bagNumber}
                  </span>
                </div>
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="flex-1 leading-relaxed">{modalError}</div>
                </div>
              )}

              {/* Mode Toggle Link */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {isAdminOverride ? 'Admin Security Override' : 'Verification Method'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminOverride(!isAdminOverride);
                    setModalError(null);
                  }}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline transition cursor-pointer"
                >
                  {isAdminOverride ? '← Use Standard OTP' : 'Use Admin Override'}
                </button>
              </div>

              {!isAdminOverride ? (
                /* OTP Field */
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Collection OTP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4-digit OTP"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-center font-mono text-lg tracking-widest font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 text-center">
                    Ask student for the 4-digit code shown on their tracking page.
                  </p>
                </div>
              ) : (
                /* Admin PIN Override Field */
                <div className="p-3.5 bg-amber-50/80 rounded-xl border-2 border-amber-300 space-y-2.5">
                  <div className="flex items-start gap-2 text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <strong>Manual Bypass Mode:</strong> Overriding OTP requires the Admin PIN. This action will be permanently logged in the audit trail.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                      Admin Security PIN <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={adminPinInput}
                        onChange={(e) => setAdminPinInput(e.target.value)}
                        placeholder="Enter Admin PIN"
                        autoFocus
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-amber-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCloseCollectModal}
                  disabled={isSubmittingCollect}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-cream-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCollect}
                  className={`px-5 py-2 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isAdminOverride
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-700/10'
                      : 'bg-maroon-700 hover:bg-maroon-800 shadow-maroon-700/10'
                  }`}
                >
                  {isSubmittingCollect ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{isAdminOverride ? 'Overriding...' : 'Verifying...'}</span>
                    </>
                  ) : isAdminOverride ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Authorize Handover</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Confirm Handover</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
