import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useStaffAuth } from '../contexts/staff-auth-context';
import {
  SEARCH_FILTER_OPTIONS,
  getSearchPlaceholder,
  filterOrders,
} from '../utils/search-utils';
import type { SearchFilterType } from '../utils/search-utils';
import {
  LogOut,
  RefreshCw,
  Search,
  AlertCircle,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CheckCircle,
  Calendar,
  Layers,
  X,
  Sparkles,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

type QueueOrder = {
  id: string;
  orderCode: string;
  bagNumber: string;
  selfReportedCount: number;
  verifiedCount?: number | null;
  status: string;
  countMismatchFlag?: boolean;
  submittedAt?: string;
  acceptedAt?: string;
  expectedReadyAt?: string;
  createdAt?: string;
  student?: {
    name?: string;
    email?: string;
    mobileNumber?: string;
    collegeId?: string;
  };
};

export default function StaffOrdersPage() {
  const { staffToken, staffUser, staffLogout } = useStaffAuth();
  const queryClient = useQueryClient();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'queue' | 'active'>('queue');
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

  const [queuePage, setQueuePage] = useState(1);
  const queueLimit = 20;

  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueFilterType, setQueueFilterType] = useState<SearchFilterType>('all');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [activeFilterType, setActiveFilterType] = useState<SearchFilterType>('all');

  // Modals & form state
  const [acceptModalOrder, setAcceptModalOrder] = useState<QueueOrder | null>(null);
  const [verifiedCountInput, setVerifiedCountInput] = useState<string>('');
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [etaModalOrder, setEtaModalOrder] = useState<QueueOrder | null>(null);
  const [etaDateInput, setEtaDateInput] = useState<string>('');
  const [etaError, setEtaError] = useState<string | null>(null);

  const [notificationBanner, setNotificationBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Bulk Ready State
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkReadyModal, setBulkReadyModal] = useState<{
    succeeded: any[];
    failed: any[];
    summary: any;
  } | null>(null);

  const toggleOrderSelection = (id: string, isProcessing: boolean) => {
    if (!isProcessing) return;
    const next = new Set(selectedOrderIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrderIds(next);
  };

  const toggleAllSelection = (orders: QueueOrder[]) => {
    const processingIds = orders.filter((o) => o.status === 'PROCESSING').map((o) => o.id);
    if (selectedOrderIds.size === processingIds.length && processingIds.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(processingIds));
    }
  };

  // 1. Fetch Queue (SUBMITTED orders)
  const queueQuery = useQuery({
    queryKey: ['staff-orders-queue', queuePage],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/staff/orders/queue`, {
        params: { page: queuePage, limit: queueLimit },
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (Array.isArray(response.data)) {
        return { orders: response.data as QueueOrder[], pagination: null };
      }
      return {
        orders: (response.data?.orders || []) as QueueOrder[],
        pagination: response.data?.pagination || null
      };
    },
    enabled: !!staffToken,
    refetchInterval: 10000,
  });

  // 2. Fetch Active Orders (ACCEPTED, PROCESSING, DELAYED)
  const activeQuery = useQuery({
    queryKey: ['staff-orders-active'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/staff/orders/active`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (Array.isArray(response.data)) {
        return response.data as QueueOrder[];
      }
      return (response.data?.orders || []) as QueueOrder[];
    },
    enabled: !!staffToken,
    refetchInterval: 10000,
  });

  // Accept Order Mutation
  const acceptMutation = useMutation({
    mutationFn: async ({ id, verifiedCount }: { id: string; verifiedCount: number }) => {
      const response = await axios.patch(
        `${API_BASE_URL}/staff/orders/${id}/accept`,
        { verifiedCount },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      return response.data?.order;
    },
    onSuccess: (updatedOrder) => {
      setAcceptModalOrder(null);
      setVerifiedCountInput('');
      setAcceptError(null);

      // Invalidate queries to refresh counts
      queryClient.invalidateQueries({ queryKey: ['staff-orders-queue'] });
      queryClient.invalidateQueries({ queryKey: ['staff-orders-active'] });

      if (updatedOrder?.countMismatchFlag) {
        setNotificationBanner({
          type: 'warning',
          title: 'Order Accepted with Count Mismatch!',
          message: `Order ${updatedOrder.orderCode} (${updatedOrder.bagNumber}) has been moved to Active Orders. Verified count (${updatedOrder.verifiedCount}) differs from student's self-reported count (${updatedOrder.selfReportedCount}).`,
        });
      } else {
        setNotificationBanner({
          type: 'success',
          title: 'Order Accepted Successfully',
          message: `Order ${updatedOrder?.orderCode || ''} (${updatedOrder?.bagNumber || ''}) is now in processing.`,
        });
      }
    },
    onError: (err: any) => {
      setAcceptError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to accept order. Please try again.'
      );
    },
  });

  // Set ETA Mutation
  const etaMutation = useMutation({
    mutationFn: async ({ id, expectedReadyAt }: { id: string; expectedReadyAt: string }) => {
      const response = await axios.patch(
        `${API_BASE_URL}/staff/orders/${id}/status`,
        { action: 'set_eta', expectedReadyAt },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      return response.data?.order;
    },
    onSuccess: (updatedOrder) => {
      setEtaModalOrder(null);
      setEtaDateInput('');
      setEtaError(null);
      queryClient.invalidateQueries({ queryKey: ['staff-orders-active'] });
      setNotificationBanner({
        type: 'success',
        title: 'ETA Updated',
        message: `Estimated completion for order ${updatedOrder?.orderCode || ''} set to ${formatDate(
          updatedOrder?.expectedReadyAt
        )}.`,
      });
    },
    onError: (err: any) => {
      setEtaError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to update ETA.'
      );
    },
  });

  // Mark Ready Mutation
  const markReadyMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await axios.patch(
        `${API_BASE_URL}/staff/orders/${id}/status`,
        { action: 'mark_ready' },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-orders-active'] });
      const order = activeOrders.find((o) => o.id === variables.id);
      const code = data?.order?.orderCode || order?.orderCode || '';
      const bag = data?.order?.bagNumber || order?.bagNumber || '';
      setNotificationBanner({
        type: 'success',
        title: 'Order Marked Ready for Pickup',
        message: `Order ${code} (${bag}) is now marked ready.`,
      });
    },
    onError: (err: any) => {
      setNotificationBanner({
        type: 'error',
        title: 'Status Update Failed',
        message:
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Could not mark order as ready.',
      });
    },
  });

  // Bulk Mark Ready Mutation
  const bulkReadyMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const response = await axios.patch(
        `${API_BASE_URL}/staff/orders/bulk/status`,
        { action: 'mark_ready', orderIds },
        { headers: { Authorization: `Bearer ${staffToken}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-orders-active'] });
      setSelectedOrderIds(new Set());
      setBulkReadyModal({
        succeeded: data.succeeded || [],
        failed: data.failed || [],
        summary: data.summary || {},
      });
      setNotificationBanner({
        type: 'success',
        title: 'Bulk Processing Completed',
        message: `Successfully marked ${data?.summary?.succeededCount || 0} order(s) as ready.${
          data?.summary?.failedCount ? ` ${data.summary.failedCount} order(s) failed.` : ''
        }`,
      });
    },
    onError: (err: any) => {
      setNotificationBanner({
        type: 'error',
        title: 'Bulk Processing Failed',
        message:
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Could not complete bulk update.',
      });
    },
  });

  const handleBulkMarkReady = () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;
    bulkReadyMutation.mutate(ids);
  };

  const submittedOrders = queueQuery.data?.orders || [];
  const queuePagination = queueQuery.data?.pagination;
  const activeOrders = activeQuery.data || [];

  const filteredSubmittedOrders = filterOrders(submittedOrders, queueSearchQuery, queueFilterType);
  const filteredActiveOrders = filterOrders(activeOrders, activeSearchQuery, activeFilterType);

  const handleOpenAcceptModal = (order: QueueOrder) => {
    setAcceptModalOrder(order);
    setVerifiedCountInput(String(order.selfReportedCount));
    setAcceptError(null);
  };

  const handleSubmitAccept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptModalOrder) return;
    const count = parseInt(verifiedCountInput, 10);
    if (isNaN(count) || count <= 0) {
      setAcceptError('Please enter a valid positive number of verified items.');
      return;
    }
    acceptMutation.mutate({ id: acceptModalOrder.id, verifiedCount: count });
  };

  const handleOpenEtaModal = (order: QueueOrder) => {
    setEtaModalOrder(order);
    if (order.expectedReadyAt) {
      try {
        const d = new Date(order.expectedReadyAt);
        setEtaDateInput(d.toISOString().split('T')[0]);
      } catch {
        setEtaDateInput('');
      }
    } else {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setEtaDateInput(tomorrow.toISOString().split('T')[0]);
    }
    setEtaError(null);
  };

  const handleSubmitEta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!etaModalOrder) return;
    if (!etaDateInput) {
      setEtaError('Please select a valid estimated ready date.');
      return;
    }
    etaMutation.mutate({
      id: etaModalOrder.id,
      expectedReadyAt: new Date(etaDateInput).toISOString(),
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
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

  const currentLoading = activeTab === 'queue' ? queueQuery.isLoading : activeQuery.isLoading;
  const currentFetching = activeTab === 'queue' ? queueQuery.isFetching : activeQuery.isFetching;

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col font-sans">
      {/* Staff Top Navigation */}
      <header className="bg-maroon-700 text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
        <Link
          to="/staff/orders"
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Flash Notification Banner */}
        {notificationBanner && notificationBanner.type !== 'success' && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 ${
              notificationBanner.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {notificationBanner.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-bold">{notificationBanner.title}</h4>
                <p className="text-xs mt-0.5 leading-relaxed">{notificationBanner.message}</p>
              </div>
            </div>
            <button
              onClick={() => setNotificationBanner(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Selection Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-cream-200">
          <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-white text-maroon-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Incoming Queue</span>
              {submittedOrders.length > 0 && (
                <span className="bg-maroon-100 text-maroon-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {submittedOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-maroon-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Active Orders</span>
              {activeOrders.length > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {activeOrders.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activeTab === 'queue') queueQuery.refetch();
                else activeQuery.refetch();
              }}
              disabled={currentFetching}
              className="flex items-center gap-2 bg-white border border-cream-200 hover:bg-cream-50 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${currentFetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Incoming Queue (SUBMITTED) */}
        {activeTab === 'queue' && (
          <div>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-slate-900">Submitted Orders Queue</h2>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  queueQuery.refetch();
                }}
                className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center"
              >
                <div className="relative w-full sm:w-56 shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    placeholder={getSearchPlaceholder(queueFilterType)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-cream-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition"
                  />
                  {queueSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setQueueSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={queueFilterType}
                    onChange={(e) => setQueueFilterType(e.target.value as SearchFilterType)}
                    className="flex-1 sm:flex-none bg-white border border-cream-300 rounded-xl text-xs font-semibold text-slate-700 py-2 pl-3 pr-8 focus:outline-hidden focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 appearance-none cursor-pointer"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1em 1em" }}
                  >
                    {SEARCH_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs shadow-maroon-700/10 active:scale-[0.98]"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </button>
                </div>
              </form>
            </div>

            {queueQuery.isError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <div>
                  <p className="font-semibold">Failed to load order queue</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {(queueQuery.error as any)?.response?.data?.error?.message ||
                      (queueQuery.error as any)?.message}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-xs border border-cream-200 overflow-hidden">
              {currentLoading ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                  <p className="text-sm">Loading queue...</p>
                </div>
              ) : submittedOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No pending submissions in queue</p>
                  <p className="text-xs text-slate-500 mt-1">
                    New student laundry drop-offs will automatically show up here.
                  </p>
                </div>
              ) : filteredSubmittedOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No matching orders</p>
                  <p className="text-xs text-slate-500 mt-1">
                    No orders match "{queueSearchQuery}". Try a different keyword or clear the search.
                  </p>
                </div>
              ) : (
                <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-cream-50 text-xs uppercase font-semibold text-slate-500 border-b border-cream-200 tracking-wider">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Order / Bag</th>
                        <th scope="col" className="px-5 py-3.5">Student Details</th>
                        <th scope="col" className="px-5 py-3.5 text-center">Self-Reported Items</th>
                        <th scope="col" className="px-5 py-3.5">Submitted</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-200">
                      {filteredSubmittedOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-cream-50/80 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="font-mono font-bold text-maroon-700 text-sm">
                              {order.orderCode}
                            </div>
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-cream-100 text-slate-800 border border-cream-200">
                                {order.bagNumber}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs">
                            <div className="font-semibold text-slate-900">
                              {order.student?.name || 'Student'}
                            </div>
                            <div className="text-slate-500">{order.student?.email || '—'}</div>
                            <div className="text-slate-400 font-mono mt-0.5">
                              {order.student?.collegeId ? `ID: ${order.student.collegeId}` : ''}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="inline-block bg-cream-100 text-slate-900 font-bold px-3 py-1 rounded-lg text-sm border border-cream-200">
                              {order.selfReportedCount} pcs
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                            {formatDateTime(order.submittedAt || order.createdAt)}
                          </td>

                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenAcceptModal(order)}
                                className="inline-flex items-center gap-1.5 bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Accept &amp; Count</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View for Submitted Orders */}
                <div className="block md:hidden divide-y divide-cream-100">
                  {filteredSubmittedOrders.map((order) => (
                    <div key={order.id} className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-mono font-bold text-maroon-700 text-sm">
                            {order.orderCode}
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[11px] font-semibold bg-cream-100 text-slate-800 border border-cream-200">
                            {order.bagNumber}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="bg-cream-100 text-slate-900 font-bold px-2.5 py-1 rounded-md text-xs border border-cream-200">
                            {order.selfReportedCount} pcs
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 bg-cream-50 p-3 rounded-lg border border-cream-100">
                        <div className="font-semibold text-slate-900">{order.student?.name || 'Student'}</div>
                        <div className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">{order.student?.email || '—'}</div>
                        {order.student?.collegeId && (
                          <div className="text-slate-400 font-mono mt-0.5">ID: {order.student.collegeId}</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-cream-100">
                        <div className="text-[11px] text-slate-500 flex flex-col">
                          <span>Submitted</span>
                          <span className="font-medium text-slate-700">{formatDateTime(order.submittedAt || order.createdAt)}</span>
                        </div>
                        <button
                          onClick={() => handleOpenAcceptModal(order)}
                          className="inline-flex items-center justify-center gap-1.5 bg-maroon-700 hover:bg-maroon-800 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer shrink-0"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Accept &amp; Count</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {queuePagination && queuePagination.totalPages > 1 && (
                  <div className="px-5 py-3.5 bg-cream-50/70 border-t border-cream-200/80 flex items-center justify-between gap-4">
                    <div className="text-xs text-slate-500">
                      Showing <span className="font-semibold text-slate-800">{(queuePage - 1) * queueLimit + 1}</span> to{' '}
                      <span className="font-semibold text-slate-800">
                        {Math.min(queuePage * queueLimit, queuePagination.totalCount)}
                      </span>{' '}
                      of <span className="font-semibold text-slate-800">{queuePagination.totalCount}</span> orders
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setQueuePage((p) => Math.max(p - 1, 1))}
                        disabled={queuePage <= 1 || queueQuery.isFetching}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-cream-300 bg-white text-slate-700 hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>
                      <span className="px-2 text-xs font-medium text-slate-600">
                        {queuePage} / {queuePagination.totalPages}
                      </span>
                      <button
                        onClick={() => setQueuePage((p) => Math.min(p + 1, queuePagination.totalPages))}
                        disabled={queuePage >= queuePagination.totalPages || queueQuery.isFetching}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-cream-300 bg-white text-slate-700 hover:bg-cream-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Active Orders (ACCEPTED / PROCESSING) */}
        {activeTab === 'active' && (
          <div>
            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-slate-900">Active Wash &amp; Processing Orders</h2>
              </div>

              <div className="flex flex-col items-stretch md:items-end gap-3 w-full md:w-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    activeQuery.refetch();
                  }}
                  className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-stretch sm:items-center"
                >
                  <div className="relative w-full sm:w-56 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={activeSearchQuery}
                      onChange={(e) => setActiveSearchQuery(e.target.value)}
                      placeholder={getSearchPlaceholder(activeFilterType)}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-cream-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 transition"
                    />
                    {activeSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setActiveSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={activeFilterType}
                      onChange={(e) => setActiveFilterType(e.target.value as SearchFilterType)}
                      className="flex-1 sm:flex-none bg-white border border-cream-300 rounded-xl text-xs font-semibold text-slate-700 py-2 pl-3 pr-8 focus:outline-hidden focus:ring-2 focus:ring-maroon-700/20 focus:border-maroon-700 appearance-none cursor-pointer"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1em 1em" }}
                    >
                      {SEARCH_FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs shadow-maroon-700/10 active:scale-[0.98]"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search</span>
                    </button>
                  </div>
                </form>

                {selectedOrderIds.size > 0 && (
                  <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl animate-in fade-in w-full sm:w-auto">
                    <span className="text-xs font-semibold text-blue-900">
                      {selectedOrderIds.size} order{selectedOrderIds.size > 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={handleBulkMarkReady}
                      disabled={bulkReadyMutation.isPending}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                    >
                      {bulkReadyMutation.isPending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Mark Selected ({selectedOrderIds.size})</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedOrderIds(new Set())}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            {activeQuery.isError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <div>
                  <p className="font-semibold">Failed to load active orders</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {(activeQuery.error as any)?.response?.data?.error?.message ||
                      (activeQuery.error as any)?.message}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-xs border border-cream-200 overflow-hidden">
              {currentLoading ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                  <p className="text-sm">Loading active orders...</p>
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No active orders in wash cycle</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Accept orders from the Incoming Queue tab to start processing them.
                  </p>
                </div>
              ) : filteredActiveOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No matching orders</p>
                  <p className="text-xs text-slate-500 mt-1">
                    No active orders match "{activeSearchQuery}". Try a different keyword or clear the search.
                  </p>
                </div>
              ) : (
                <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-cream-50 text-xs uppercase font-semibold text-slate-500 border-b border-cream-200 tracking-wider">
                      <tr>
                        <th scope="col" className="px-4 py-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredActiveOrders.filter((o) => o.status === 'PROCESSING').length > 0 &&
                              selectedOrderIds.size ===
                                filteredActiveOrders.filter((o) => o.status === 'PROCESSING').length
                            }
                            onChange={() => toggleAllSelection(filteredActiveOrders)}
                            disabled={!filteredActiveOrders.some((o) => o.status === 'PROCESSING')}
                            aria-label="Select all processing orders"
                            className="w-4 h-4 rounded border-cream-300 text-maroon-700 focus:ring-maroon-700 cursor-pointer disabled:opacity-40"
                          />
                        </th>
                        <th scope="col" className="px-5 py-3.5">Order / Bag</th>
                        <th scope="col" className="px-5 py-3.5">Student</th>
                        <th scope="col" className="px-5 py-3.5 text-center">Verified Count</th>
                        <th scope="col" className="px-5 py-3.5">Status &amp; Timeline</th>
                        <th scope="col" className="px-5 py-3.5">Estimated Ready (ETA)</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-200">
                      {filteredActiveOrders.map((order) => {
                        const isMismatch = order.countMismatchFlag;
                        const isProcessing = order.status === 'PROCESSING';
                        const isSelected = selectedOrderIds.has(order.id);
                        return (
                          <tr
                            key={order.id}
                            className={`transition-colors ${
                              isSelected ? 'bg-cream-100/80 hover:bg-cream-100' : 'hover:bg-cream-50/80'
                            }`}
                          >
                            <td className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOrderSelection(order.id, isProcessing)}
                                disabled={!isProcessing}
                                aria-label={`Select order ${order.orderCode}`}
                                className="w-4 h-4 rounded border-cream-300 text-maroon-700 focus:ring-maroon-700 cursor-pointer disabled:opacity-30"
                              />
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-mono font-bold text-maroon-700 text-sm">
                                {order.orderCode}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-cream-100 text-slate-800 border border-cream-200">
                                  {order.bagNumber}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-xs">
                              <div className="font-semibold text-slate-900">
                                {order.student?.name || 'Student'}
                              </div>
                              <div className="text-slate-500">{order.student?.email || '—'}</div>
                              {order.student?.mobileNumber && (
                                <div className="text-slate-400 font-mono text-[11px]">
                                  {order.student.mobileNumber}
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="font-bold text-slate-900 text-sm">
                                  {order.verifiedCount ?? order.selfReportedCount} pcs
                                </span>
                                {isMismatch ? (
                                  <span
                                    title={`Mismatch: Student self-reported ${order.selfReportedCount} items`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 mt-1"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                    <span>Mismatch ({order.selfReportedCount} rep.)</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 mt-0.5">
                                    Reported: {order.selfReportedCount}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-xs">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Clock className="w-3 h-3 animate-spin text-indigo-500" />
                                <span>{order.status}</span>
                              </span>
                              <div className="text-slate-400 text-[11px] mt-1">
                                Accepted: {formatDateTime(order.acceptedAt)}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-xs">
                              {order.expectedReadyAt ? (
                                <div>
                                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{formatDate(order.expectedReadyAt)}</span>
                                  </div>
                                  <button
                                    onClick={() => handleOpenEtaModal(order)}
                                    className="text-[11px] text-maroon-700 hover:text-maroon-800 underline mt-0.5 cursor-pointer"
                                  >
                                    Change ETA
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenEtaModal(order)}
                                  className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition font-medium cursor-pointer"
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>Set ETA</span>
                                </button>
                              )}
                            </td>

                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEtaModal(order)}
                                  title="Set or update expected delivery date"
                                  className="hidden sm:inline-flex items-center gap-1 bg-white hover:bg-cream-100 text-slate-700 border border-cream-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>ETA</span>
                                </button>

                                <button
                                  onClick={() => {
                                    markReadyMutation.mutate({ id: order.id });
                                  }}
                                  disabled={markReadyMutation.isPending}
                                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Mark Ready</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View for Active Orders */}
                <div className="block md:hidden divide-y divide-cream-100">
                  {filteredActiveOrders.map((order) => {
                    const isMismatch = order.countMismatchFlag;
                    const isProcessing = order.status === 'PROCESSING';
                    const isSelected = selectedOrderIds.has(order.id);
                    return (
                      <div
                        key={order.id}
                        className={`p-4 flex flex-col gap-3 transition-colors ${
                          isSelected ? 'bg-cream-100/60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2.5">
                            <div className="pt-0.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOrderSelection(order.id, isProcessing)}
                                disabled={!isProcessing}
                                aria-label={`Select order ${order.orderCode}`}
                                className="w-4 h-4 rounded border-cream-300 text-maroon-700 focus:ring-maroon-700 cursor-pointer disabled:opacity-30"
                              />
                            </div>
                            <div>
                              <div className="font-mono font-bold text-maroon-700 text-sm">
                                {order.orderCode}
                              </div>
                              <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[11px] font-semibold bg-cream-100 text-slate-800 border border-cream-200">
                                {order.bagNumber}
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <span className="font-bold text-slate-900 text-sm">
                              {order.verifiedCount ?? order.selfReportedCount} pcs
                            </span>
                            {isMismatch ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 mt-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                <span>Mismatch ({order.selfReportedCount} rep.)</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 mt-0.5">
                                Reported: {order.selfReportedCount}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 bg-cream-50 p-3 rounded-lg border border-cream-100 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-slate-900">{order.student?.name || 'Student'}</div>
                              <div className="text-slate-500 text-[11px]">{order.student?.email || '—'}</div>
                              {order.student?.mobileNumber && (
                                <div className="text-slate-400 font-mono text-[10px]">{order.student.mobileNumber}</div>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                              <Clock className="w-2.5 h-2.5 animate-spin text-indigo-500" />
                              <span>{order.status}</span>
                            </span>
                          </div>

                          <div className="pt-2 border-t border-cream-200 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Estimated Delivery:</span>
                            {order.expectedReadyAt ? (
                              <div className="font-semibold text-slate-800 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{formatDate(order.expectedReadyAt)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Not set</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-cream-100 mt-1">
                          {order.expectedReadyAt ? (
                            <button
                              onClick={() => handleOpenEtaModal(order)}
                              className="flex-1 inline-flex items-center justify-center gap-1 bg-white hover:bg-cream-100 text-slate-700 border border-cream-300 text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>Change ETA</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenEtaModal(order)}
                              className="flex-1 inline-flex items-center justify-center gap-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 py-2.5 rounded-xl transition font-medium cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-amber-600" />
                              <span>Set ETA</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              markReadyMutation.mutate({ id: order.id });
                            }}
                            disabled={markReadyMutation.isPending}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Mark Ready</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: Accept Order & Verify Item Count */}
      {acceptModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-cream-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-maroon-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base">Accept Order &amp; Verify Count</h3>
                <p className="text-xs text-slate-400">
                  {acceptModalOrder.orderCode} • {acceptModalOrder.bagNumber}
                </p>
              </div>
              <button
                onClick={() => setAcceptModalOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAccept} className="p-6 space-y-4">
              <div className="p-3.5 bg-cream-50 rounded-xl border border-cream-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-medium text-slate-900">
                    {acceptModalOrder.student?.name || acceptModalOrder.student?.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Self-Reported Count:</span>
                  <span className="font-bold text-maroon-700 text-sm">
                    {acceptModalOrder.selfReportedCount} items
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Physical Verified Item Count <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={verifiedCountInput}
                  onChange={(e) => setVerifiedCountInput(e.target.value)}
                  className="w-full text-base font-bold px-3.5 py-2.5 border border-cream-300 rounded-xl focus:ring-2 focus:ring-maroon-700 focus:outline-hidden text-slate-900 bg-white"
                  placeholder="Count pieces in bag"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Physically count all garments inside the bag before proceeding. If the count differs from{' '}
                  <span className="font-semibold">{acceptModalOrder.selfReportedCount}</span>, a count mismatch flag will automatically be logged.
                </p>
              </div>

              {parseInt(verifiedCountInput, 10) > 0 &&
                parseInt(verifiedCountInput, 10) !== acceptModalOrder.selfReportedCount && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Count Mismatch Warning:</span> Verified count ({verifiedCountInput}) differs from self-reported ({acceptModalOrder.selfReportedCount}). This order will be flagged for audit.
                    </div>
                  </div>
                )}

              {acceptError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{acceptError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAcceptModalOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-cream-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acceptMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Accept Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Set ETA Date */}
      {etaModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-cream-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-maroon-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base">Set Estimated Ready Date</h3>
                <p className="text-xs text-slate-400">
                  {etaModalOrder.orderCode} • {etaModalOrder.bagNumber}
                </p>
              </div>
              <button
                onClick={() => setEtaModalOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEta} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Expected Ready for Pickup Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={etaDateInput}
                  onChange={(e) => setEtaDateInput(e.target.value)}
                  className="w-full text-sm font-semibold px-3.5 py-2.5 border border-cream-300 rounded-xl focus:ring-2 focus:ring-maroon-700 focus:outline-hidden text-slate-900 bg-white"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Students will see this updated ETA on their live tracking timeline.
                </p>
              </div>

              {etaError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{etaError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEtaModalOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-cream-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={etaMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {etaMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Save Estimated Date</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Bulk Mark Ready Summary Results */}
      {bulkReadyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-cream-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="bg-maroon-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base">Bulk Ready Update Summary</h3>
                  <p className="text-xs text-slate-400">
                    {bulkReadyModal.summary?.succeededCount || 0} succeeded,{' '}
                    {bulkReadyModal.summary?.failedCount || 0} failed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkReadyModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {bulkReadyModal.succeeded.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ready for Pickup ({bulkReadyModal.succeeded.length})</span>
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {bulkReadyModal.succeeded.map((item: any) => (
                      <div
                        key={item.orderId}
                        className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-mono font-bold text-slate-900">
                            {item.orderCode} <span className="font-sans font-semibold text-slate-600">({item.bagNumber})</span>
                          </div>
                          {item.studentName && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{item.studentName}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-2 py-1 rounded-md inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bulkReadyModal.failed.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2.5 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Failed / Ineligible ({bulkReadyModal.failed.length})</span>
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {bulkReadyModal.failed.map((item: any) => (
                      <div
                        key={item.orderId}
                        className="bg-red-50/60 border border-red-200 rounded-xl p-3 text-xs"
                      >
                        <div className="font-mono font-bold text-slate-900">
                          {item.orderCode ? `${item.orderCode} (${item.bagNumber})` : item.orderId}
                        </div>
                        <p className="text-red-700 text-[11px] mt-0.5">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-cream-50 border-t border-cream-200 shrink-0">
              <button
                onClick={() => setBulkReadyModal(null)}
                className="w-full py-2.5 bg-maroon-900 hover:bg-maroon-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
