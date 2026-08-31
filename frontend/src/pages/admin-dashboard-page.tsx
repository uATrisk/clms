import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { useStaffAuth } from '../contexts/staff-auth-context';
import {
  ShieldAlert,
  Users,
  Package,
  Plus,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface StaffMember {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'WASHER' | 'COLLECTION';
  active: boolean;
  createdAt: string;
}

interface OrderItem {
  id: string;
  orderCode: string;
  status: string;
  selfReportedCount: number;
  verifiedCount?: number;
  countMismatchFlag: boolean;
  submittedAt: string;
  expectedReadyAt?: string;
  actualReadyAt?: string;
  collectedAt?: string;
  student: {
    name: string;
    email: string;
    bagNumber: string;
    mobileNumber: string;
    collegeId: string;
  };
  assignedWasher?: {
    name: string;
  };
}

interface OrdersResponse {
  orders: OrderItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export default function AdminDashboardPage() {
  const { staffToken, staffUser, staffLogout } = useStaffAuth();
  const queryClient = useQueryClient();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'staff' | 'orders'>('staff');

  // Staff creation modal state
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'WASHER' | 'COLLECTION' | 'ADMIN'>('WASHER');
  const [createStaffError, setCreateStaffError] = useState<string | null>(null);

  // General Notification Banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Orders Tab filters & pagination state
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [orderPage, setOrderPage] = useState<number>(1);
  const orderLimit = 20;

  // 1. Fetch Staff List Query
  const staffQuery = useQuery<StaffMember[]>({
    queryKey: ['admin-staff'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/admin/staff`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      return response.data.staff;
    },
    enabled: !!staffToken,
  });

  // 2. Fetch Orders List Query
  const ordersQuery = useQuery<OrdersResponse>({
    queryKey: ['admin-orders', orderPage, orderLimit, orderStatusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: orderPage,
        limit: orderLimit,
      };
      if (orderStatusFilter) {
        params.status = orderStatusFilter;
      }
      const response = await axios.get(`${API_BASE_URL}/admin/orders`, {
        params,
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      return response.data;
    },
    enabled: !!staffToken && activeTab === 'orders',
  });

  // 3. Create Staff Mutation
  const createStaffMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_BASE_URL}/admin/staff`,
        {
          name: newStaffName.trim(),
          username: newStaffUsername.trim(),
          password: newStaffPassword.trim(),
          role: newStaffRole,
        },
        {
          headers: { Authorization: `Bearer ${staffToken}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      setIsCreateStaffOpen(false);
      setNewStaffName('');
      setNewStaffUsername('');
      setNewStaffPassword('');
      setNewStaffRole('WASHER');
      setCreateStaffError(null);
      setNotification({
        type: 'success',
        message: 'New staff member registered successfully.',
      });
    },
    onError: (err: any) => {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.response?.data?.errors?.fieldErrors?.password?.[0] ||
        'Failed to create staff member.';
      setCreateStaffError(message);
    },
  });

  // 4. Update Staff Active Status Mutation
  const toggleStaffStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/staff/${id}`,
        { active },
        {
          headers: { Authorization: `Bearer ${staffToken}` },
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      setNotification({
        type: 'success',
        message: `Staff status updated to ${variables.active ? 'Active' : 'Inactive'}.`,
      });
    },
    onError: (err: any) => {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Could not update staff status.';
      setNotification({
        type: 'error',
        message,
      });
    },
  });

  const handleCreateStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffUsername.trim() || !newStaffPassword.trim()) {
      setCreateStaffError('All fields are required.');
      return;
    }
    if (newStaffPassword.length < 6) {
      setCreateStaffError('Password must be at least 6 characters.');
      return;
    }
    setCreateStaffError(null);
    createStaffMutation.mutate();
  };

  const handleStatusToggle = (staff: StaffMember) => {
    if (staff.id === staffUser?.id && staff.active) {
      setNotification({
        type: 'error',
        message: 'Admins cannot deactivate their own account.',
      });
      return;
    }
    toggleStaffStatusMutation.mutate({ id: staff.id, active: !staff.active });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ACCEPTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PROCESSING':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DELAYED':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'READY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'COLLECTED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'COMPLAINT_RAISED':
      case 'UNDER_REVIEW':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'WASHER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COLLECTION':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Admin Header */}
      <header className="bg-slate-900 text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight">CLMS Admin Operations</h1>
            <p className="text-[11px] text-slate-400">System Controls &amp; Management</p>
          </div>
        </div>

        {/* Navigation Switcher Tabs */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <Link
            to="/admin/dashboard"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              location.pathname === '/admin/dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Admin Portal
          </Link>
          <Link
            to="/staff/orders"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              location.pathname === '/staff/orders'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Washer Queue
          </Link>
          <Link
            to="/staff/collection"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              location.pathname === '/staff/collection'
                ? 'bg-blue-600 text-white shadow-xs'
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
            <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-400 bg-blue-950/70 border border-blue-800/60 px-1.5 py-0.5 rounded">
              ADMIN
            </span>
          </div>

          <button
            onClick={staffLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Notification Banner */}
        {notification && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between shadow-xs border ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'staff'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Staff Accounts
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              Master Orders View
            </button>
          </div>

          {activeTab === 'staff' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-staff'] })}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                title="Refresh staff list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCreateStaffError(null);
                  setIsCreateStaffOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Register Staff
              </button>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                title="Refresh master orders"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: STAFF MANAGEMENT */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Staff &amp; Operator Accounts</h2>
                  <p className="text-xs text-slate-500">
                    Manage active logins for washers, collection agents, and system administrators.
                  </p>
                </div>
                <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  {staffQuery.data?.length || 0} Total Accounts
                </div>
              </div>

              {staffQuery.isLoading ? (
                <div className="p-12 text-center text-slate-400">Loading staff directory...</div>
              ) : staffQuery.data?.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No staff members found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Name</th>
                        <th className="py-3.5 px-4">Username</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Created Date</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffQuery.data?.map((staff) => (
                        <tr key={staff.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{staff.name}</td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            @{staff.username}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadge(
                                staff.role
                              )}`}
                            >
                              {staff.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {formatDate(staff.createdAt)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                staff.active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  staff.active ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              {staff.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleStatusToggle(staff)}
                              disabled={toggleStaffStatusMutation.isPending}
                              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                                staff.active
                                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {staff.active ? 'Deactivate' : 'Activate'}
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

        {/* TAB 2: ORDER OVERVIEW */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <label htmlFor="status-filter" className="text-xs font-semibold text-slate-600">
                  Filter by Status:
                </label>
                <select
                  id="status-filter"
                  value={orderStatusFilter}
                  onChange={(e) => {
                    setOrderStatusFilter(e.target.value);
                    setOrderPage(1); // Reset to first page
                  }}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">All Statuses</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="ACCEPTED">ACCEPTED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="DELAYED">DELAYED</option>
                  <option value="READY">READY</option>
                  <option value="COLLECTED">COLLECTED</option>
                  <option value="COMPLAINT_RAISED">COMPLAINT_RAISED</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              {ordersQuery.data?.pagination && (
                <div className="text-xs text-slate-500">
                  Showing {ordersQuery.data.orders.length} of{' '}
                  <span className="font-semibold text-slate-800">
                    {ordersQuery.data.pagination.totalCount}
                  </span>{' '}
                  orders
                </div>
              )}
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {ordersQuery.isLoading ? (
                <div className="p-12 text-center text-slate-400">Loading master orders...</div>
              ) : ordersQuery.data?.orders?.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  No orders match the selected criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Order Code</th>
                        <th className="py-3.5 px-4">Bag #</th>
                        <th className="py-3.5 px-4">Student Details</th>
                        <th className="py-3.5 px-4">Items (Claimed / Verified)</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Submitted At</th>
                        <th className="py-3.5 px-4">Assigned Washer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ordersQuery.data?.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {order.orderCode}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                              {order.student.bagNumber}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-900 font-medium">{order.student.name}</div>
                            <div className="text-[11px] text-slate-400">{order.student.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800">
                                {order.verifiedCount ?? order.selfReportedCount}
                              </span>
                              {order.verifiedCount &&
                                order.verifiedCount !== order.selfReportedCount && (
                                  <span className="text-[11px] text-rose-500 font-medium">
                                    (Was: {order.selfReportedCount})
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {formatDateTime(order.submittedAt)}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {order.assignedWasher?.name || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {ordersQuery.data?.pagination && ordersQuery.data.pagination.totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Page {ordersQuery.data.pagination.page} of{' '}
                    {ordersQuery.data.pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                      disabled={orderPage <= 1 || ordersQuery.isFetching}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium disabled:opacity-50 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </button>
                    <button
                      onClick={() =>
                        setOrderPage((p) =>
                          Math.min(ordersQuery.data?.pagination.totalPages || 1, p + 1)
                        )
                      }
                      disabled={
                        orderPage >= (ordersQuery.data?.pagination.totalPages || 1) ||
                        ordersQuery.isFetching
                      }
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium disabled:opacity-50 transition"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CREATE STAFF MODAL */}
      {isCreateStaffOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Register Staff Account</h3>
              </div>
              <button
                onClick={() => setIsCreateStaffOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaffSubmit} className="p-6 space-y-4">
              {createStaffError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{createStaffError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <div className="relative">
                  <span className="text-slate-400 absolute left-3 top-2 text-sm font-mono pointer-events-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value)}
                    placeholder="washer_john"
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Role
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) =>
                    setNewStaffRole(e.target.value as 'WASHER' | 'COLLECTION' | 'ADMIN')
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                >
                  <option value="WASHER">Washer (Intake &amp; Wash Operations)</option>
                  <option value="COLLECTION">Collection (Desk &amp; Handover)</option>
                  <option value="ADMIN">Admin (Full System Controls)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateStaffOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStaffMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 disabled:bg-blue-400"
                >
                  {createStaffMutation.isPending ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
