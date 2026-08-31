import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useStaffAuth } from '../contexts/staff-auth-context';
import {
  Search,
  LogOut,
  ShieldCheck,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Hash,
  X,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

type ReadyOrder = {
  id: string;
  orderCode: string;
  bagNumber: string;
  status: string;
  actualReadyAt?: string;
  student?: {
    name?: string;
    email?: string;
  };
};

export default function StaffCollectionPage() {
  const { staffToken, staffUser, staffLogout } = useStaffAuth();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<ReadyOrder[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Collect Modal State
  const [collectModalOrder, setCollectModalOrder] = useState<ReadyOrder | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [returnedCountInput, setReturnedCountInput] = useState('');
  const [isSubmittingCollect, setIsSubmittingCollect] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Success / Global Notification Banner
  const [notificationBanner, setNotificationBanner] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchError('Please enter a search query (Bag #, Student ID, Mobile, or Order Code).');
      return;
    }

    setSearchError(null);
    setIsSearching(true);
    setNotificationBanner(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/staff/orders/search`, {
        params: { q: trimmed },
        headers: { Authorization: `Bearer ${staffToken}` },
      });

      const orders = response.data?.orders || [];
      setSearchResults(orders);
      setHasSearched(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to perform search. Please try again.';
      setSearchError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenCollectModal = (order: ReadyOrder) => {
    setCollectModalOrder(order);
    setOtpInput('');
    setReturnedCountInput('');
    setModalError(null);
  };

  const handleCloseCollectModal = () => {
    if (isSubmittingCollect) return;
    setCollectModalOrder(null);
    setOtpInput('');
    setReturnedCountInput('');
    setModalError(null);
  };

  const handleSubmitCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectModalOrder) return;

    const trimmedOtp = otpInput.trim();
    if (!trimmedOtp) {
      setModalError('Please enter the 4-digit collection OTP provided by the student.');
      return;
    }

    const count = parseInt(returnedCountInput, 10);
    if (isNaN(count) || count < 0) {
      setModalError('Please enter a valid non-negative number of returned garments.');
      return;
    }

    setModalError(null);
    setIsSubmittingCollect(true);

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/staff/orders/${collectModalOrder.id}/collect`,
        {
          otp: trimmedOtp,
          returnedCount: count,
        },
        {
          headers: { Authorization: `Bearer ${staffToken}` },
        }
      );

      const collectedOrder = response.data?.order;
      const orderCode = collectedOrder?.orderCode || collectModalOrder.orderCode;

      // Remove the collected order from current search results
      setSearchResults((prev) => prev.filter((o) => o.id !== collectModalOrder.id));

      // Close modal
      setCollectModalOrder(null);

      // Show success notification banner
      setNotificationBanner({
        type: 'success',
        title: 'Laundry Handover Completed',
        message: `Order ${orderCode} has been successfully verified and marked as COLLECTED.`,
      });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setModalError('Invalid OTP, please try again.');
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Staff Top Navigation */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight">CLMS Collection Desk</h1>
            <p className="text-[11px] text-slate-400">Order Verification &amp; Handover</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <Link
            to="/staff/orders"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              location.pathname === '/staff/orders'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Washer Queue
          </Link>
          <Link
            to="/staff/collection"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              location.pathname === '/staff/collection'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Collection Desk
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-slate-200">
              {staffUser?.name || staffUser?.username}
            </p>
            <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded uppercase font-semibold tracking-wider">
              {staffUser?.role}
            </span>
          </div>

          <button
            onClick={staffLogout}
            title="Sign Out"
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-300 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-red-700 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-center gap-2">
        <Link
          to="/staff/orders"
          className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition ${
            location.pathname === '/staff/orders'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          Washer Queue
        </Link>
        <Link
          to="/staff/collection"
          className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition ${
            location.pathname === '/staff/collection'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          Collection Desk
        </Link>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Flash Notification Banner */}
        {notificationBanner && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 ${
              notificationBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {notificationBanner.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Lookup Ready Orders
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Search by Bag Number, Student College ID, Mobile Number, or Order Code to verify student collection.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. BAG-102, 2024RU101, 9876543210, LN-ABCD-1234"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs shadow-emerald-700/10"
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
          {!hasSearched ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                Ready to Process Collections
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1">
                Enter a search term above to locate customer orders in <span className="font-semibold text-emerald-600">READY</span> status awaiting pickup.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-700">
                No Ready Orders Found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1">
                No orders in <strong>READY</strong> status matched "{searchQuery}". The order may still be processing or has already been collected.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {searchResults.length} Ready Order{searchResults.length === 1 ? '' : 's'} Found
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {searchResults.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                          {order.orderCode}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          READY FOR PICKUP
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Hash className="w-3 h-3 text-slate-500" />
                          Bag #{order.bagNumber}
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

                    <div className="flex items-center sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        onClick={() => handleOpenCollectModal(order)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs shadow-emerald-700/10"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Handover Verification
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {collectModalOrder.orderCode} (Bag #{collectModalOrder.bagNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseCollectModal}
                disabled={isSubmittingCollect}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCollect} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
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

              {/* OTP Field */}
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-mono text-lg tracking-widest font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  Ask student for the 4-digit code shown on their tracking page.
                </p>
              </div>

              {/* Returned Count Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Returned Garment Count <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={returnedCountInput}
                  onChange={(e) => setReturnedCountInput(e.target.value)}
                  placeholder="e.g. 5"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Physically verify the number of items being handed back to the student.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCloseCollectModal}
                  disabled={isSubmittingCollect}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCollect}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs shadow-emerald-700/10"
                >
                  {isSubmittingCollect ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying...</span>
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
