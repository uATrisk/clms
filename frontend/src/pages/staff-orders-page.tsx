import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useStaffAuth } from '../contexts/staff-auth-context';
import { LogOut, RefreshCw, AlertCircle, Inbox, ShieldCheck } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

type QueueOrder = {
  id: string;
  orderCode: string;
  bagNumber: string;
  selfReportedCount: number;
  status: string;
  submittedAt?: string;
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

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['staff-orders-queue'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/staff/orders/queue`, {
        headers: {
          Authorization: `Bearer ${staffToken}`,
        },
      });
      // Resiliently support either { orders: [...] } or direct array [...]
      if (Array.isArray(response.data)) {
        return response.data as QueueOrder[];
      }
      return (response.data?.orders || []) as QueueOrder[];
    },
    enabled: !!staffToken,
    refetchInterval: 10000, // Refresh automatically every 10 seconds
  });

  const orders = data || [];

  const formatDate = (dateStr?: string) => {
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Staff Top Navigation */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight">CLMS Staff Queue</h1>
            <p className="text-[11px] text-slate-400">Incoming Laundry Requests</p>
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Submitted Orders Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live queue of newly submitted student laundry requests awaiting physical intake.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="self-start sm:self-auto flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Error State */}
        {isError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold">Failed to load order queue</p>
              <p className="text-xs text-red-700 mt-0.5">
                {(error as any)?.response?.data?.error?.message ||
                  (error as any)?.response?.data?.message ||
                  error.message}
              </p>
            </div>
          </div>
        )}

        {/* Table / List Container */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-sm">Loading incoming queue...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No orders in queue</p>
              <p className="text-xs text-slate-500 mt-1">
                New laundry submissions will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      Order Code
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Bag Number
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-center">
                      Items Count
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Student Email
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Submitted At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orders.map((order) => (
                    <tr
                      key={order.id || order.orderCode}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                        {order.orderCode}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {order.bagNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {order.selfReportedCount}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="font-medium text-slate-900">
                          {order.student?.email || '—'}
                        </div>
                        {order.student?.name && (
                          <div className="text-xs text-slate-400">
                            {order.student.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                        {formatDate(order.submittedAt || order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
