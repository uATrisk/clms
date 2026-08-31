import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useStaffAuth } from '../contexts/staff-auth-context';
import {
  LogOut,
  RefreshCw,
  AlertCircle,
  Inbox,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CheckCircle,
  Calendar,
  Layers,
  X,
  Sparkles,
  KeyRound,
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

  const [activeTab, setActiveTab] = useState<'queue' | 'active'>('queue');

  // Modals & form state
  const [acceptModalOrder, setAcceptModalOrder] = useState<QueueOrder | null>(null);
  const [verifiedCountInput, setVerifiedCountInput] = useState<string>('');
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [etaModalOrder, setEtaModalOrder] = useState<QueueOrder | null>(null);
  const [etaDateInput, setEtaDateInput] = useState<string>('');
  const [etaError, setEtaError] = useState<string | null>(null);

  const [readyOtpModal, setReadyOtpModal] = useState<{
    orderCode: string;
    bagNumber: string;
    otp: string;
    studentName?: string;
  } | null>(null);

  const [notificationBanner, setNotificationBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // 1. Fetch Queue (SUBMITTED orders)
  const queueQuery = useQuery({
    queryKey: ['staff-orders-queue'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/staff/orders/queue`, {
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
          message: `Order ${updatedOrder.orderCode} (Bag ${updatedOrder.bagNumber}) has been moved to Active Orders. Verified count (${updatedOrder.verifiedCount}) differs from student's self-reported count (${updatedOrder.selfReportedCount}).`,
        });
      } else {
        setNotificationBanner({
          type: 'success',
          title: 'Order Accepted Successfully',
          message: `Order ${updatedOrder?.orderCode || ''} (Bag ${updatedOrder?.bagNumber || ''}) is now in processing.`,
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
      setReadyOtpModal({
        orderCode: data?.order?.orderCode || order?.orderCode || '',
        bagNumber: data?.order?.bagNumber || order?.bagNumber || '',
        otp: data?.collectionOtp || '—',
        studentName: data?.order?.student?.name || order?.student?.name,
      });
      setNotificationBanner({
        type: 'success',
        title: 'Order Marked Ready for Pickup',
        message: `Order ${data?.order?.orderCode || ''} is now ready. Collection OTP generated: ${data?.collectionOtp}`,
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

  const submittedOrders = queueQuery.data || [];
  const activeOrders = activeQuery.data || [];

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Staff Top Navigation */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight">CLMS Washer Operations</h1>
            <p className="text-[11px] text-slate-400">Intake &amp; Processing Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Flash Notification Banner */}
        {notificationBanner && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 ${
              notificationBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : notificationBanner.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {notificationBanner.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : notificationBanner.type === 'warning' ? (
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Incoming Queue</span>
              {submittedOrders.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {submittedOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-blue-700 shadow-xs'
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
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${currentFetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Incoming Queue (SUBMITTED) */}
        {activeTab === 'queue' && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Submitted Orders Queue</h2>
              <p className="text-xs text-slate-500">
                Bags dropped off by students awaiting physical count verification and intake into wash cycle.
              </p>
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

            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
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
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Order / Bag</th>
                        <th scope="col" className="px-5 py-3.5">Student Details</th>
                        <th scope="col" className="px-5 py-3.5 text-center">Self-Reported Items</th>
                        <th scope="col" className="px-5 py-3.5">Submitted</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {submittedOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="font-mono font-bold text-blue-600 text-sm">
                              {order.orderCode}
                            </div>
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                Bag #{order.bagNumber}
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
                            <span className="inline-block bg-slate-100 text-slate-900 font-bold px-3 py-1 rounded-lg text-sm border border-slate-200">
                              {order.selfReportedCount} pcs
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                            {formatDateTime(order.submittedAt || order.createdAt)}
                          </td>

                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleOpenAcceptModal(order)}
                              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Accept &amp; Count</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Active Orders (ACCEPTED / PROCESSING) */}
        {activeTab === 'active' && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Active Wash &amp; Processing Orders</h2>
              <p className="text-xs text-slate-500">
                Orders physically accepted and currently in the washing, drying, or pressing cycle. Set ETAs or mark ready once finished.
              </p>
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

            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
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
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Order / Bag</th>
                        <th scope="col" className="px-5 py-3.5">Student</th>
                        <th scope="col" className="px-5 py-3.5 text-center">Verified Count</th>
                        <th scope="col" className="px-5 py-3.5">Status &amp; Timeline</th>
                        <th scope="col" className="px-5 py-3.5">Estimated Ready (ETA)</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeOrders.map((order) => {
                        const isMismatch = order.countMismatchFlag;
                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <div className="font-mono font-bold text-blue-600 text-sm">
                                {order.orderCode}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                  Bag #{order.bagNumber}
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
                                    className="text-[11px] text-blue-600 hover:text-blue-800 underline mt-0.5 cursor-pointer"
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
                                  className="hidden sm:inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>ETA</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Mark Order ${order.orderCode} (Bag ${order.bagNumber}) as READY for pickup? This will generate a pickup OTP.`
                                      )
                                    ) {
                                      markReadyMutation.mutate({ id: order.id });
                                    }
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
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: Accept Order & Verify Item Count */}
      {acceptModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Accept Order &amp; Verify Count</h3>
                <p className="text-xs text-slate-400">
                  {acceptModalOrder.orderCode} • Bag #{acceptModalOrder.bagNumber}
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
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-medium text-slate-900">
                    {acceptModalOrder.student?.name || acceptModalOrder.student?.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Self-Reported Count:</span>
                  <span className="font-bold text-blue-600 text-sm">
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
                  className="w-full text-base font-bold px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-900 bg-white"
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
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acceptMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Set Estimated Ready Date</h3>
                <p className="text-xs text-slate-400">
                  {etaModalOrder.orderCode} • Bag #{etaModalOrder.bagNumber}
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
                  className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-900 bg-white"
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
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={etaMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
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

      {/* MODAL 3: Mark Ready OTP Generated Banner / Modal */}
      {readyOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-600 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Order Ready for Collection</h3>
                  <p className="text-xs text-emerald-100">Collection OTP Generated</p>
                </div>
              </div>
              <button
                onClick={() => setReadyOtpModal(null)}
                className="text-emerald-100 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                <p>
                  Order <span className="font-mono font-bold text-slate-900">{readyOtpModal.orderCode}</span> (Bag #{readyOtpModal.bagNumber}) is now marked ready.
                </p>
                {readyOtpModal.studentName && (
                  <p className="text-[11px] text-slate-400 mt-0.5">Student: {readyOtpModal.studentName}</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  4-Digit Collection OTP
                </p>
                <div className="inline-flex items-center justify-center px-6 py-3 bg-emerald-50 border-2 border-emerald-500 rounded-2xl">
                  <span className="font-mono text-3xl font-black tracking-widest text-emerald-700">
                    {readyOtpModal.otp}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This OTP has been attached to the student's live tracking view. Handover staff will require this OTP to verify collection.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setReadyOtpModal(null)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Done / Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
