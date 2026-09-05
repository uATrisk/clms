import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/auth-context';
import { AppShell } from '../components/app-shell';
import {
  History,
  PlusCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...args: (string | undefined | null | false)[]) {
  return twMerge(clsx(args));
}

interface ComplaintItem {
  id: string;
  category: string;
  description: string;
  status: string;
  raisedAt: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
}

interface OrderHistoryItem {
  id: string;
  orderCode: string;
  bagNumber: string;
  status: 'COLLECTED' | 'CANCELLED';
  selfReportedCount: number;
  verifiedCount?: number | null;
  returnedCount?: number | null;
  countMismatchFlag: boolean;
  submittedAt: string;
  acceptedAt?: string | null;
  expectedReadyAt?: string | null;
  actualReadyAt?: string | null;
  collectedAt?: string | null;
  student: {
    name: string;
    bagNumber?: string | null;
    collegeId?: string | null;
    maskedMobile?: string;
  };
  timeline?: Array<{
    fromStatus: string | null;
    toStatus: string;
    changedAt: string;
    note?: string | null;
  }>;
  complaints?: ComplaintItem[];
}

interface HistoryResponse {
  orders: OrderHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export default function HistoryPage() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<HistoryResponse>({
    queryKey: ['my-order-history', token, page],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/orders/history?page=${page}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-8 w-full animate-fade-in">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-5">
          <div className="space-y-1">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-maroon-900 tracking-tight">
              Order History
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              Review your completed and archived laundry records.
            </p>
          </div>
          <Link
            to="/submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-maroon-700 hover:bg-maroon-800 text-white font-medium text-sm rounded-xl shadow-sm hover:shadow transition-all active:scale-95 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            Submit New Laundry
          </Link>
        </div>

        {/* Content Section */}
        {isLoading && orders.length === 0 ? (
          /* Loading Skeletons */
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-cream-200 animate-pulse flex flex-col gap-4"
              >
                <div className="flex justify-between items-center">
                  <div className="h-6 w-32 bg-cream-200 rounded-md"></div>
                  <div className="h-6 w-24 bg-cream-200 rounded-full"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="h-10 bg-cream-100 rounded-xl"></div>
                  <div className="h-10 bg-cream-100 rounded-xl"></div>
                  <div className="h-10 bg-cream-100 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl p-8 sm:p-14 shadow-sm border border-cream-200 text-center flex flex-col items-center gap-5 my-4">
            <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center text-maroon-400 ring-8 ring-cream-50">
              <History className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-gray-900">
                No Past Orders
              </h3>
              <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                You haven&apos;t completed any laundry requests yet. Once your laundry is picked up or finished, your history will appear here.
              </p>
            </div>
            <Link
              to="/submit"
              className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-maroon-700 text-white font-semibold text-sm rounded-xl hover:bg-maroon-800 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Submit Laundry
            </Link>
          </div>
        ) : (
          /* Populated Orders List */
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
              <span>{pagination?.totalCount || orders.length} total orders found</span>
              {totalPages > 1 && (
                <span>
                  Page {pagination?.page || 1} of {totalPages}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {orders.map((order) => {
                const isCollected = order.status === 'COLLECTED';
                const hasComplaints = !!(order.complaints && order.complaints.length > 0);

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-cream-200 hover:border-maroon-200 transition-all flex flex-col gap-5 group"
                  >
                    {/* Order Card Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cream-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-maroon-50 border border-maroon-100 text-maroon-800 font-serif font-bold text-base flex items-center justify-center shadow-xs">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-base sm:text-lg">
                              {order.orderCode}
                            </span>
                            <span className="text-xs bg-cream-100 text-maroon-900 border border-cream-200 px-2 py-0.5 rounded-md font-semibold">
                              {order.bagNumber}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            ID: {order.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        {/* Complaints indicator badge */}
                        {hasComplaints && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-full shadow-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            {order.complaints?.length === 1
                              ? '1 Complaint'
                              : `${order.complaints?.length} Complaints`}
                          </span>
                        )}

                        {/* Status badge */}
                        <span
                          className={cx(
                            'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-xs',
                            isCollected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          )}
                        >
                          {isCollected ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                      {/* Clothes Count Info */}
                      <div className="bg-cream-50/60 border border-cream-200/60 rounded-xl p-3.5 flex flex-col justify-between gap-1">
                        <span className="text-gray-500 font-medium flex items-center gap-1.5 text-xs">
                          <Layers className="w-3.5 h-3.5 text-maroon-600" />
                          Item Counts
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2 mt-1">
                          <span className="text-gray-900 font-bold text-sm sm:text-base">
                            {order.selfReportedCount} Items
                          </span>
                          {order.verifiedCount !== null && order.verifiedCount !== undefined && (
                            <span className="text-xs text-gray-500">
                              ({order.verifiedCount} verified)
                            </span>
                          )}
                        </div>

                        {/* Count mismatch flag indicator */}
                        {order.countMismatchFlag && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            Count mismatch flagged
                          </div>
                        )}
                      </div>

                      {/* Submitted Date */}
                      <div className="bg-cream-50/60 border border-cream-200/60 rounded-xl p-3.5 flex flex-col justify-between gap-1">
                        <span className="text-gray-500 font-medium flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-maroon-600" />
                          Submitted
                        </span>
                        <span className="text-gray-900 font-semibold text-xs sm:text-sm mt-1">
                          {formatDate(order.submittedAt)}
                        </span>
                      </div>

                      {/* Collected / Completed Date */}
                      <div className="bg-cream-50/60 border border-cream-200/60 rounded-xl p-3.5 flex flex-col justify-between gap-1">
                        <span className="text-gray-500 font-medium flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-maroon-600" />
                          {isCollected ? 'Collected' : 'Ended'}
                        </span>
                        <span className="text-gray-900 font-semibold text-xs sm:text-sm mt-1">
                          {isCollected ? formatDate(order.collectedAt) : 'Order Cancelled'}
                        </span>
                      </div>
                    </div>

                    {/* Order Action Footer */}
                    <div className="flex items-center justify-end pt-2">
                      <Link
                        to={`/track/${order.orderCode}`}
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-maroon-700 hover:text-maroon-900 group-hover:translate-x-0.5 transition-all"
                      >
                        View Order Details & Timeline
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-cream-200 pt-6 px-1 mt-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border border-cream-300 bg-white text-gray-700 hover:bg-cream-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <span className="text-xs sm:text-sm font-medium text-gray-600">
                  Page <span className="font-bold text-gray-900">{page}</span> of{' '}
                  <span className="font-bold text-gray-900">{totalPages}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border border-cream-300 bg-white text-gray-700 hover:bg-cream-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
