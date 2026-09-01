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
  BarChart3,
  Clock,
  AlertTriangle,
  Layers,
  Inbox,
  MessageSquare,
  CheckSquare,
  ArrowUpRight,
  Megaphone,
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

type ComplaintCategory =
  | 'MISSING'
  | 'DAMAGED'
  | 'WRONG_COUNT'
  | 'WRONG_BAG'
  | 'NOT_READY'
  | 'OTHER';

type ComplaintStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';

interface ComplaintItem {
  id: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  raisedAt: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  order: {
    id: string;
    orderCode: string;
    bagNumber: string;
    status: string;
    student: {
      id: string;
      name: string;
      email: string;
      bagNumber: string;
      mobileNumber: string;
      collegeId?: string | null;
    };
  };
  handledBy?: {
    id: string;
    name: string;
    username: string;
  } | null;
}

interface ComplaintsResponse {
  complaints: ComplaintItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

interface AnalyticsSummary {
  turnaroundTime: {
    averageHours: number;
    orderCount: number;
  };
  peakSubmissionHours: number[];
  statusBreakdown: Record<string, number>;
  complaintFrequency: Record<string, number>;
  countMismatchRate: {
    percentage: number;
    mismatched: number;
    total: number;
  };
}

interface AdminAnnouncementItem {
  id: string;
  title: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface AdminAnnouncementsResponse {
  announcements: AdminAnnouncementItem[];
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

  const [activeTab, setActiveTab] = useState<'staff' | 'orders' | 'complaints' | 'analytics' | 'announcements'>('staff');

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

  // Complaints Tab filters, pagination & resolve modal state
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<string>('');
  const [complaintPage, setComplaintPage] = useState<number>(1);
  const complaintLimit = 20;

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [activeComplaintForResolve, setActiveComplaintForResolve] = useState<ComplaintItem | null>(null);
  const [resolutionNoteText, setResolutionNoteText] = useState('');
  const [resolveModalError, setResolveModalError] = useState<string | null>(null);

  // Announcements Tab pagination & modal state
  const [announcementPage, setAnnouncementPage] = useState<number>(1);
  const announcementLimit = 10;
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementBody, setNewAnnouncementBody] = useState('');
  const [createAnnouncementError, setCreateAnnouncementError] = useState<string | null>(null);

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

  // 3. Fetch Complaints List Query
  const complaintsQuery = useQuery<ComplaintsResponse>({
    queryKey: ['admin-complaints', complaintPage, complaintLimit, complaintStatusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: complaintPage,
        limit: complaintLimit,
      };
      if (complaintStatusFilter) {
        params.status = complaintStatusFilter;
      }
      const response = await axios.get(`${API_BASE_URL}/admin/complaints`, {
        params,
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      return response.data;
    },
    enabled: !!staffToken && activeTab === 'complaints',
  });

  // 4. Fetch Analytics Query
  const analyticsQuery = useQuery<AnalyticsSummary>({
    queryKey: ['admin-analytics-summary'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/admin/analytics/summary`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      return response.data;
    },
    enabled: !!staffToken && activeTab === 'analytics',
    staleTime: 1000 * 60 * 5,
  });

  // 5. Fetch Announcements Query
  const announcementsQuery = useQuery<AdminAnnouncementsResponse>({
    queryKey: ['admin-announcements', announcementPage, announcementLimit],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/admin/announcements?page=${announcementPage}&limit=${announcementLimit}`,
        {
          headers: { Authorization: `Bearer ${staffToken}` },
        }
      );
      return response.data;
    },
    enabled: !!staffToken && activeTab === 'announcements',
  });

  // 5. Create Staff Mutation
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

  // 6. Update Staff Active Status Mutation
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

  // 7. Update Complaint Mutation
  const updateComplaintMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      resolutionNote,
    }: {
      id: string;
      status: 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';
      resolutionNote?: string;
    }) => {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/complaints/${id}`,
        {
          status,
          ...(resolutionNote !== undefined ? { resolutionNote: resolutionNote.trim() } : {}),
        },
        {
          headers: { Authorization: `Bearer ${staffToken}` },
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics-summary'] });
      setIsResolveModalOpen(false);
      setActiveComplaintForResolve(null);
      setResolutionNoteText('');
      setResolveModalError(null);
      setNotification({
        type: 'success',
        message: `Complaint marked as ${variables.status.replace('_', ' ')}.`,
      });
    },
    onError: (err: any) => {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to update complaint status.';
      if (activeComplaintForResolve) {
        setResolveModalError(message);
      } else {
        setNotification({
          type: 'error',
          message,
        });
      }
    },
  });

  // 8. Create Announcement Mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_BASE_URL}/admin/announcements`,
        {
          title: newAnnouncementTitle.trim(),
          body: newAnnouncementBody.trim(),
        },
        {
          headers: { Authorization: `Bearer ${staffToken}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setIsCreateAnnouncementOpen(false);
      setNewAnnouncementTitle('');
      setNewAnnouncementBody('');
      setCreateAnnouncementError(null);
      setNotification({
        type: 'success',
        message: 'Announcement posted successfully.',
      });
    },
    onError: (err: any) => {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.response?.data?.errors?.fieldErrors?.title?.[0] ||
        err.response?.data?.errors?.fieldErrors?.body?.[0] ||
        'Failed to post announcement.';
      setCreateAnnouncementError(message);
    },
  });

  // 9. Toggle Announcement Status Mutation
  const toggleAnnouncementStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/announcements/${id}`,
        { isActive },
        {
          headers: { Authorization: `Bearer ${staffToken}` },
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setNotification({
        type: 'success',
        message: `Announcement ${variables.isActive ? 'activated' : 'archived'} successfully.`,
      });
    },
    onError: (err: any) => {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Could not update announcement status.';
      setNotification({
        type: 'error',
        message,
      });
    },
  });

  const handleCreateAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncementTitle.trim() || !newAnnouncementBody.trim()) {
      setCreateAnnouncementError('Title and body are both required.');
      return;
    }
    setCreateAnnouncementError(null);
    createAnnouncementMutation.mutate();
  };

  const handleToggleAnnouncementStatus = (announcement: AdminAnnouncementItem) => {
    toggleAnnouncementStatusMutation.mutate({
      id: announcement.id,
      isActive: !announcement.isActive,
    });
  };

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

  const handleOpenResolveModal = (complaint: ComplaintItem) => {
    setActiveComplaintForResolve(complaint);
    setResolutionNoteText('');
    setResolveModalError(null);
    setIsResolveModalOpen(true);
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaintForResolve) return;
    if (!resolutionNoteText.trim()) {
      setResolveModalError('A resolution note is required when resolving a complaint.');
      return;
    }
    setResolveModalError(null);
    updateComplaintMutation.mutate({
      id: activeComplaintForResolve.id,
      status: 'RESOLVED',
      resolutionNote: resolutionNoteText.trim(),
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

  const getComplaintStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'OPEN':
        return {
          label: 'Open',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'UNDER_REVIEW':
        return {
          label: 'Under Review',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'RESOLVED':
        return {
          label: 'Resolved',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'ESCALATED':
        return {
          label: 'Escalated',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          label: status,
          className: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const formatCategory = (category: string) => {
    switch (category) {
      case 'MISSING':
        return 'Missing Items';
      case 'DAMAGED':
        return 'Damaged Clothes';
      case 'WRONG_COUNT':
        return 'Wrong Count';
      case 'WRONG_BAG':
        return 'Wrong Bag';
      case 'NOT_READY':
        return 'Not Ready / Delayed';
      case 'OTHER':
        return 'Other Issue';
      default:
        return category.replace('_', ' ');
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

  const analyticsData = analyticsQuery.data;
  const totalOrdersInBreakdown = analyticsData
    ? Object.values(analyticsData.statusBreakdown).reduce((acc, curr) => acc + curr, 0)
    : 0;

  const maxPeakHourCount = analyticsData
    ? Math.max(...analyticsData.peakSubmissionHours, 1)
    : 1;

  const totalComplaints = analyticsData
    ? Object.values(analyticsData.complaintFrequency).reduce((acc, curr) => acc + curr, 0)
    : 0;

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col font-sans">
      {/* Top Admin Header */}
      <header className="bg-maroon-900 text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-maroon-800 text-maroon-200 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-sm sm:text-base font-bold tracking-tight">CLMS Admin Operations</h1>
            <p className="text-[11px] text-cream-200">System Controls &amp; Analytics</p>
          </div>
        </div>

        {/* Navigation Switcher Tabs */}
        <div className="hidden md:flex items-center gap-1.5 bg-maroon-800/80 p-1 rounded-xl border border-maroon-700/60">
          <Link
            to="/admin/dashboard"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              location.pathname === '/admin/dashboard'
                ? 'bg-maroon-700 text-white shadow-xs'
                : 'text-cream-200 hover:text-white hover:bg-maroon-700/50'
            }`}
          >
            Admin Portal
          </Link>
          <Link
            to="/staff/orders"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              location.pathname === '/staff/orders'
                ? 'bg-maroon-700 text-white shadow-xs'
                : 'text-cream-200 hover:text-white hover:bg-maroon-700/50'
            }`}
          >
            Washer Queue
          </Link>
          <Link
            to="/staff/collection"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              location.pathname === '/staff/collection'
                ? 'bg-maroon-700 text-white shadow-xs'
                : 'text-cream-200 hover:text-white hover:bg-maroon-700/50'
            }`}
          >
            Collection Desk
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-cream-100">
              {staffUser?.name || staffUser?.username}
            </p>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-maroon-200 bg-maroon-950/70 border border-maroon-800/60 px-1.5 py-0.5 rounded">
              ADMIN
            </span>
          </div>

          <button
            onClick={staffLogout}
            className="p-2 text-cream-200 hover:text-rose-400 hover:bg-maroon-800 rounded-lg transition"
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
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cream-200 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-maroon-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-cream-100 border border-cream-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Staff Accounts
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-maroon-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-cream-100 border border-cream-200'
              }`}
            >
              <Package className="w-4 h-4" />
              Master Orders View
            </button>
            <button
              onClick={() => setActiveTab('complaints')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'complaints'
                  ? 'bg-maroon-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-cream-100 border border-cream-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Complaints &amp; Disputes
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-maroon-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-cream-100 border border-cream-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics &amp; Metrics
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-maroon-700 text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-cream-100 border border-cream-200'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Announcements
            </button>
          </div>

          {activeTab === 'staff' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-staff'] })}
                className="p-2 rounded-lg border border-cream-200 bg-white text-gray-600 hover:bg-cream-50 transition cursor-pointer"
                title="Refresh staff list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCreateStaffError(null);
                  setIsCreateStaffOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-maroon-700 hover:bg-maroon-800 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
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
                className="p-2 rounded-lg border border-cream-200 bg-white text-gray-600 hover:bg-cream-50 transition cursor-pointer"
                title="Refresh master orders"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-complaints'] })}
                className="p-2 rounded-lg border border-cream-200 bg-white text-gray-600 hover:bg-cream-50 transition cursor-pointer"
                title="Refresh complaints list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-analytics-summary'] })}
                className="p-2 rounded-lg border border-cream-200 bg-white text-gray-600 hover:bg-cream-50 transition cursor-pointer"
                title="Refresh analytics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })}
                className="p-2 rounded-lg border border-cream-200 bg-white text-gray-600 hover:bg-cream-50 transition cursor-pointer"
                title="Refresh announcements list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCreateAnnouncementError(null);
                  setIsCreateAnnouncementOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-maroon-700 hover:bg-maroon-800 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Post Announcement</span>
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: STAFF MANAGEMENT */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="bg-white border border-cream-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-cream-100 bg-cream-50/50 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-base sm:text-lg font-bold text-gray-900">Staff &amp; Operator Accounts</h2>
                  <p className="text-xs text-gray-500">
                    Manage active logins for washers, collection agents, and system administrators.
                  </p>
                </div>
                <div className="text-xs font-semibold text-gray-600 bg-cream-100 px-2.5 py-1 rounded-full border border-cream-200">
                  {staffQuery.data?.length || 0} Total Accounts
                </div>
              </div>

              {staffQuery.isLoading ? (
                <div className="p-12 text-center text-gray-400">Loading staff directory...</div>
              ) : staffQuery.data?.length === 0 ? (
                <div className="p-12 text-center text-gray-400">No staff members found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-cream-50 text-gray-700 text-xs uppercase font-semibold border-b border-cream-200">
                      <tr>
                        <th className="py-3.5 px-4">Name</th>
                        <th className="py-3.5 px-4">Username</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Created Date</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-100">
                      {staffQuery.data?.map((staff) => (
                        <tr key={staff.id} className="hover:bg-cream-50/80 transition">
                          <td className="py-3.5 px-4 font-semibold text-gray-900">{staff.name}</td>
                          <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
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
                          <td className="py-3.5 px-4 text-xs text-gray-500">
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
                              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
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
            <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-gray-400" />
                <label htmlFor="status-filter" className="text-xs font-semibold text-gray-600">
                  Filter by Status:
                </label>
                <select
                  id="status-filter"
                  value={orderStatusFilter}
                  onChange={(e) => {
                    setOrderStatusFilter(e.target.value);
                    setOrderPage(1);
                  }}
                  className="bg-cream-50 border border-cream-300 text-gray-800 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-maroon-700"
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
                <div className="text-xs text-gray-500">
                  Showing {ordersQuery.data.orders.length} of{' '}
                  <span className="font-semibold text-gray-800">
                    {ordersQuery.data.pagination.totalCount}
                  </span>{' '}
                  orders
                </div>
              )}
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-cream-200 rounded-2xl shadow-xs overflow-hidden">
              {ordersQuery.isLoading ? (
                <div className="p-12 text-center text-gray-400">Loading master orders...</div>
              ) : ordersQuery.data?.orders?.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  No orders match the selected criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-cream-50 text-gray-700 text-xs uppercase font-semibold border-b border-cream-200">
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
                    <tbody className="divide-y divide-cream-100">
                      {ordersQuery.data?.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-cream-50 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                            {order.orderCode}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-gray-800 bg-cream-100 px-2 py-0.5 rounded border border-cream-200 text-xs">
                              {order.student.bagNumber}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-gray-900 font-medium">{order.student.name}</div>
                            <div className="text-[11px] text-gray-400">{order.student.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-800">
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
                          <td className="py-3.5 px-4 text-xs text-gray-500">
                            {formatDateTime(order.submittedAt)}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-600">
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
                <div className="p-4 border-t border-cream-200 bg-cream-50/50 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Page {ordersQuery.data.pagination.page} of{' '}
                    {ordersQuery.data.pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                      disabled={orderPage <= 1 || ordersQuery.isFetching}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-cream-200 text-gray-700 hover:bg-cream-100 rounded-lg text-xs font-medium disabled:opacity-50 transition"
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
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-cream-200 text-gray-700 hover:bg-cream-100 rounded-lg text-xs font-medium disabled:opacity-50 transition"
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

        {/* TAB 3: COMPLAINTS MANAGEMENT */}
        {activeTab === 'complaints' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-gray-400" />
                <label htmlFor="complaint-status-filter" className="text-xs font-semibold text-gray-600">
                  Filter by Status:
                </label>
                <select
                  id="complaint-status-filter"
                  value={complaintStatusFilter}
                  onChange={(e) => {
                    setComplaintStatusFilter(e.target.value);
                    setComplaintPage(1);
                  }}
                  className="bg-cream-50 border border-cream-200 text-gray-800 text-xs rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-maroon-700"
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="ESCALATED">ESCALATED</option>
                </select>
              </div>

              {complaintsQuery.data?.pagination && (
                <div className="text-xs text-gray-500">
                  Showing {complaintsQuery.data.complaints.length} of{' '}
                  <span className="font-semibold text-gray-800">
                    {complaintsQuery.data.pagination.totalCount}
                  </span>{' '}
                  complaints
                </div>
              )}
            </div>

            {/* Complaints List Table */}
            <div className="bg-white border border-cream-200 rounded-2xl shadow-xs overflow-hidden">
              {complaintsQuery.isLoading ? (
                <div className="p-12 text-center text-gray-400">Loading student complaints...</div>
              ) : complaintsQuery.data?.complaints?.length === 0 ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Inbox className="w-8 h-8 text-cream-300" />
                  <p className="text-sm font-medium">No complaints match the selected filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-cream-50 text-gray-700 text-xs uppercase font-semibold border-b border-cream-200">
                      <tr>
                        <th className="py-3.5 px-4">Category &amp; Raised</th>
                        <th className="py-3.5 px-4">Order / Bag</th>
                        <th className="py-3.5 px-4">Student Details</th>
                        <th className="py-3.5 px-4 max-w-xs">Description</th>
                        <th className="py-3.5 px-4">Status &amp; Handling</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-100">
                      {complaintsQuery.data?.complaints.map((complaint) => {
                        const badge = getComplaintStatusBadge(complaint.status);
                        const isActionable = complaint.status === 'OPEN' || complaint.status === 'UNDER_REVIEW';

                        return (
                          <tr key={complaint.id} className="hover:bg-cream-50 transition align-top">
                            {/* Category & Date */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-gray-900 text-xs">
                                {formatCategory(complaint.category)}
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {formatDateTime(complaint.raisedAt)}
                              </div>
                            </td>

                            {/* Order & Bag */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-mono font-bold text-gray-900 text-xs">
                                {complaint.order.orderCode}
                              </div>
                              <div className="mt-1">
                                <span className="font-semibold text-gray-700 bg-cream-100 px-2 py-0.5 rounded border border-cream-200 text-[11px]">
                                  {complaint.order.bagNumber}
                                </span>
                              </div>
                            </td>

                            {/* Student */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="text-gray-900 font-medium text-xs">
                                {complaint.order.student.name}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                {complaint.order.student.email}
                              </div>
                              <div className="text-[11px] text-gray-500 font-mono">
                                {complaint.order.student.mobileNumber}
                              </div>
                            </td>

                            {/* Description & Resolution Notes */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <p
                                className="text-xs text-gray-800 line-clamp-2 leading-relaxed"
                                title={complaint.description}
                              >
                                {complaint.description}
                              </p>
                              {complaint.status === 'RESOLVED' && complaint.resolutionNote && (
                                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-0.5">
                                  <span className="font-semibold text-emerald-900 block text-[11px]">
                                    Resolution Note:
                                  </span>
                                  <p
                                    className="text-emerald-800 text-xs leading-relaxed"
                                    title={complaint.resolutionNote}
                                  >
                                    {complaint.resolutionNote}
                                  </p>
                                </div>
                              )}
                            </td>

                            {/* Status Badge & Handler */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                              {complaint.handledBy && (
                                <div className="text-[11px] text-gray-400 mt-1">
                                  Handled by: <span className="font-medium text-gray-600">@{complaint.handledBy.username}</span>
                                </div>
                              )}
                              {complaint.resolvedAt && (
                                <div className="text-[11px] text-gray-400">
                                  Resolved: {formatDate(complaint.resolvedAt)}
                                </div>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {isActionable ? (
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {complaint.status === 'OPEN' && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateComplaintMutation.mutate({
                                          id: complaint.id,
                                          status: 'UNDER_REVIEW',
                                        })
                                      }
                                      disabled={updateComplaintMutation.isPending}
                                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                                      title="Mark under investigation"
                                    >
                                      Under Review
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleOpenResolveModal(complaint)}
                                    disabled={updateComplaintMutation.isPending}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1"
                                    title="Provide resolution and close complaint"
                                  >
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    Resolve
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateComplaintMutation.mutate({
                                        id: complaint.id,
                                        status: 'ESCALATED',
                                      })
                                    }
                                    disabled={updateComplaintMutation.isPending}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1"
                                    title="Escalate issue to supervisory review"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    Escalate
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Read-only</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {complaintsQuery.data?.pagination && complaintsQuery.data.pagination.totalPages > 1 && (
                <div className="p-4 border-t border-cream-200 bg-cream-50/50 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Page {complaintsQuery.data.pagination.page} of{' '}
                    {complaintsQuery.data.pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setComplaintPage((p) => Math.max(1, p - 1))}
                      disabled={complaintPage <= 1 || complaintsQuery.isFetching}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-cream-200 text-gray-700 hover:bg-cream-100 rounded-lg text-xs font-medium disabled:opacity-50 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </button>
                    <button
                      onClick={() =>
                        setComplaintPage((p) =>
                          Math.min(complaintsQuery.data?.pagination.totalPages || 1, p + 1)
                        )
                      }
                      disabled={
                        complaintPage >= (complaintsQuery.data?.pagination.totalPages || 1) ||
                        complaintsQuery.isFetching
                      }
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-cream-200 text-gray-700 hover:bg-cream-100 rounded-lg text-xs font-medium disabled:opacity-50 transition"
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

        {/* TAB 4: ANALYTICS & METRICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analyticsQuery.isLoading ? (
              <div className="bg-white border border-cream-200 rounded-2xl p-16 text-center shadow-xs">
                <div className="inline-block animate-spin mb-3">
                  <RefreshCw className="w-6 h-6 text-maroon-600" />
                </div>
                <p className="text-sm font-medium text-gray-600">Calculating system metrics &amp; analytics...</p>
              </div>
            ) : analyticsQuery.isError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800 shadow-xs">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                <h3 className="font-bold text-base">Failed to load analytics summary</h3>
                <p className="text-xs text-rose-600 mt-1 mb-4">
                  {(analyticsQuery.error as any)?.response?.data?.message ||
                    'An error occurred while fetching aggregated metrics.'}
                </p>
                <button
                  onClick={() => analyticsQuery.refetch()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  Retry Analysis
                </button>
              </div>
            ) : analyticsData ? (
              <>
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Turnaround Time Card */}
                  <div className="bg-white border border-cream-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Average Turnaround
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-cream-100 text-maroon-700 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {analyticsData.turnaroundTime.averageHours}{' '}
                        <span className="text-base font-semibold text-gray-500">hrs</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                        <span>Based on</span>
                        <span className="font-semibold text-gray-800">
                          {analyticsData.turnaroundTime.orderCount}
                        </span>
                        <span>collected order{analyticsData.turnaroundTime.orderCount === 1 ? '' : 's'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Count Mismatch Rate Card */}
                  <div className="bg-white border border-cream-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Count Mismatch Rate
                      </span>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        analyticsData.countMismatchRate.percentage > 0
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {analyticsData.countMismatchRate.percentage}%
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                        <span className="font-semibold text-gray-800">
                          {analyticsData.countMismatchRate.mismatched}
                        </span>
                        <span>of</span>
                        <span className="font-semibold text-gray-800">
                          {analyticsData.countMismatchRate.total}
                        </span>
                        <span>verified intake orders</span>
                      </p>
                    </div>
                  </div>

                  {/* Total Managed Volume */}
                  <div className="bg-white border border-cream-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Total Orders Recorded
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-cream-100 text-maroon-700 flex items-center justify-center">
                        <Layers className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {totalOrdersInBreakdown}
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                        <span className="font-semibold text-emerald-600">
                          {analyticsData.statusBreakdown.COLLECTED || 0}
                        </span>
                        <span>completed handover(s)</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Second Row: Peak Submission Hours (24-Bar Histogram) */}
                <div className="bg-white border border-cream-200 rounded-2xl p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                      <h3 className="font-serif font-bold text-base text-gray-900">Peak Submission Hours (24h)</h3>
                      <p className="text-xs text-gray-500">
                        Hourly distribution of student drop-offs throughout the day (00:00 – 23:00 UTC).
                      </p>
                    </div>
                    <div className="text-[11px] text-gray-400 italic">
                      *Times aggregated in server UTC
                    </div>
                  </div>

                  {/* CSS-Based 24-Bar Histogram */}
                  <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-cream-200">
                    {analyticsData.peakSubmissionHours.map((count, hour) => {
                      const heightPercent =
                        count > 0
                          ? Math.max(8, Math.round((count / maxPeakHourCount) * 100))
                          : 2;

                      return (
                        <div
                          key={hour}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative"
                        >
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -top-8 bg-gray-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow-md z-10 whitespace-nowrap">
                            {String(hour).padStart(2, '0')}:00 UTC — {count} order{count === 1 ? '' : 's'}
                          </div>

                          {/* Bar */}
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t transition-all ${
                              count > 0
                                ? 'bg-maroon-700 hover:bg-maroon-600'
                                : 'bg-cream-100 hover:bg-cream-200'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* X-Axis Hour Labels */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-2">
                    <span>00:00</span>
                    <span className="hidden sm:inline">04:00</span>
                    <span>08:00</span>
                    <span className="hidden sm:inline">12:00</span>
                    <span>16:00</span>
                    <span className="hidden sm:inline">20:00</span>
                    <span>23:00</span>
                  </div>
                </div>

                {/* Third Row: Status Breakdown & Complaint Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status Breakdown Section */}
                  <div className="bg-white border border-cream-200 rounded-2xl p-6 shadow-xs">
                    <h3 className="font-serif font-bold text-base text-gray-900 mb-1">Lifecycle Status Breakdown</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Real-time distribution of orders across active stages.
                    </p>

                    <div className="space-y-3">
                      {Object.entries(analyticsData.statusBreakdown).map(([status, count]) => {
                        const percent =
                          totalOrdersInBreakdown > 0
                            ? Math.round((count / totalOrdersInBreakdown) * 100)
                            : 0;

                        return (
                          <div key={status} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-gray-700">{status}</span>
                              <span className="font-mono text-gray-500">
                                {count}{' '}
                                <span className="text-[11px] text-gray-400">({percent}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-cream-100 rounded-full h-2 overflow-hidden">
                              <div
                                style={{ width: `${percent}%` }}
                                className={`h-full rounded-full transition-all duration-300 ${
                                  status === 'COLLECTED'
                                    ? 'bg-slate-500'
                                    : status === 'READY'
                                    ? 'bg-emerald-500'
                                    : status === 'PROCESSING'
                                    ? 'bg-indigo-500'
                                    : status === 'ACCEPTED'
                                    ? 'bg-amber-500'
                                    : status === 'SUBMITTED'
                                    ? 'bg-blue-500'
                                    : 'bg-rose-500'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Complaint Frequency Section */}
                  <div className="bg-white border border-cream-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-serif font-bold text-base text-gray-900">Complaint Frequency</h3>
                        <span className="text-xs font-semibold text-gray-500 bg-cream-100 px-2 py-0.5 rounded-full">
                          {totalComplaints} Total
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        Reported student discrepancies and issues categorized by type.
                      </p>

                      <div className="divide-y divide-cream-100">
                        {Object.entries(analyticsData.complaintFrequency).map(([category, count]) => {
                          const percent =
                            totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0;

                          return (
                            <div key={category} className="py-2.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cream-400" />
                                <span className="font-medium text-gray-700 capitalize">
                                  {category.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-gray-600">
                                <span className="font-semibold text-gray-900">{count}</span>
                                <span className="text-[11px] text-gray-400">({percent}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {totalComplaints === 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-cream-50 border border-cream-200 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
                        <Inbox className="w-4 h-4" />
                        <span>No student complaints have been logged in the system yet.</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 5: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="bg-white border border-cream-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-cream-200 bg-cream-50 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg font-bold text-gray-900">Campus Announcements</h2>
                  <p className="text-xs text-gray-500">
                    Broadcast operational updates, notices, and schedule alerts to students.
                  </p>
                </div>
                <div className="text-xs font-semibold text-gray-700 bg-cream-100 px-2.5 py-1 rounded-full border border-cream-200">
                  {announcementsQuery.data?.pagination.totalCount || 0} Total Announcements
                </div>
              </div>

              {announcementsQuery.isLoading ? (
                <div className="p-12 text-center text-gray-400">Loading announcements...</div>
              ) : announcementsQuery.data?.announcements.length === 0 ? (
                <div className="p-12 text-center text-gray-400">No announcements found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-cream-50 text-gray-700 text-xs uppercase font-semibold border-b border-cream-200">
                      <tr>
                        <th className="py-3.5 px-4">Title &amp; Content</th>
                        <th className="py-3.5 px-4">Author</th>
                        <th className="py-3.5 px-4">Posted Date</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-100">
                      {announcementsQuery.data?.announcements.map((announcement) => (
                        <tr key={announcement.id} className="hover:bg-cream-50 transition">
                          <td className="py-3.5 px-4 max-w-md">
                            <div className="font-semibold text-gray-900">{announcement.title}</div>
                            <div className="text-xs text-gray-500 line-clamp-2 mt-0.5 whitespace-pre-wrap">
                              {announcement.body}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-700">
                            {announcement.createdBy?.name || 'Admin'}
                            {announcement.createdBy?.role && (
                              <span className="text-[10px] text-gray-400 block uppercase">
                                {announcement.createdBy.role}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                            {formatDateTime(announcement.createdAt)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                announcement.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-cream-100 text-gray-600 border border-cream-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  announcement.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                                }`}
                              />
                              {announcement.isActive ? 'Active' : 'Archived'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleToggleAnnouncementStatus(announcement)}
                              disabled={toggleAnnouncementStatusMutation.isPending}
                              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                                announcement.isActive
                                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {announcement.isActive ? 'Archive' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {announcementsQuery.data && announcementsQuery.data.pagination.totalPages > 1 && (
                <div className="p-4 border-t border-cream-200 bg-cream-50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Page {announcementsQuery.data.pagination.page} of{' '}
                    {announcementsQuery.data.pagination.totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAnnouncementPage((prev) => Math.max(prev - 1, 1))}
                      disabled={announcementPage <= 1}
                      className="p-1.5 rounded-lg border border-cream-200 bg-white text-gray-700 hover:bg-cream-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setAnnouncementPage((prev) =>
                          Math.min(prev + 1, announcementsQuery.data?.pagination.totalPages || prev)
                        )
                      }
                      disabled={
                        announcementPage >=
                        (announcementsQuery.data?.pagination.totalPages || 1)
                      }
                      className="p-1.5 rounded-lg border border-cream-200 bg-white text-gray-700 hover:bg-cream-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {isCreateAnnouncementOpen && (
        <div className="fixed inset-0 bg-maroon-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-cream-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-maroon-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-5 h-5 text-maroon-200" />
                <h3 className="font-serif font-bold text-base">New Announcement</h3>
              </div>
              <button
                onClick={() => setIsCreateAnnouncementOpen(false)}
                className="text-cream-200 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncementSubmit} className="p-6 space-y-4">
              {createAnnouncementError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{createAnnouncementError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newAnnouncementTitle}
                  onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                  placeholder="E.g., Holiday Schedule for Laundry"
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Message / Body
                </label>
                <textarea
                  value={newAnnouncementBody}
                  onChange={(e) => setNewAnnouncementBody(e.target.value)}
                  placeholder="Details of the announcement..."
                  rows={4}
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-700 outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-cream-100">
                <button
                  type="button"
                  onClick={() => setIsCreateAnnouncementOpen(false)}
                  className="px-4 py-2 border border-cream-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-cream-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAnnouncementMutation.isPending}
                  className="px-4 py-2 bg-maroon-700 hover:bg-maroon-800 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 disabled:bg-maroon-400 cursor-pointer shadow-xs"
                >
                  {createAnnouncementMutation.isPending ? 'Posting...' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      {isCreateStaffOpen && (
        <div className="fixed inset-0 bg-maroon-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-cream-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-maroon-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-maroon-200" />
                <h3 className="font-serif font-bold text-base">Register Staff Account</h3>
              </div>
              <button
                onClick={() => setIsCreateStaffOpen(false)}
                className="text-cream-200 hover:text-white p-1 rounded-lg transition cursor-pointer"
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
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 border border-cream-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <div className="relative">
                  <span className="text-gray-400 absolute left-3 top-2 text-sm font-mono pointer-events-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value)}
                    placeholder="washer_john"
                    className="w-full pl-8 pr-3 py-2 border border-cream-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-700 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 border border-cream-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Role
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) =>
                    setNewStaffRole(e.target.value as 'WASHER' | 'COLLECTION' | 'ADMIN')
                  }
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-maroon-700 outline-none"
                >
                  <option value="WASHER">Washer (Intake &amp; Wash Operations)</option>
                  <option value="COLLECTION">Collection (Desk &amp; Handover)</option>
                  <option value="ADMIN">Admin (Full System Controls)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-cream-100">
                <button
                  type="button"
                  onClick={() => setIsCreateStaffOpen(false)}
                  className="px-4 py-2 border border-cream-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-cream-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStaffMutation.isPending}
                  className="px-4 py-2 bg-maroon-700 hover:bg-maroon-800 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 disabled:bg-maroon-400 cursor-pointer shadow-xs"
                >
                  {createStaffMutation.isPending ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE COMPLAINT MODAL */}
      {isResolveModalOpen && activeComplaintForResolve && (
        <div className="fixed inset-0 bg-maroon-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-cream-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-maroon-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-serif font-bold text-base">Resolve Student Complaint</h3>
                  <p className="text-xs text-cream-200">
                    Order #{activeComplaintForResolve.order.orderCode} •{' '}
                    {formatCategory(activeComplaintForResolve.category)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!updateComplaintMutation.isPending) setIsResolveModalOpen(false);
                }}
                disabled={updateComplaintMutation.isPending}
                className="text-cream-200 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResolve} className="p-6 space-y-4">
              {resolveModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{resolveModalError}</span>
                </div>
              )}

              {/* Original Complaint Context */}
              <div className="p-3 bg-cream-50 border border-cream-200 rounded-xl space-y-1 text-xs">
                <span className="font-semibold text-gray-700 block">
                  Student Issue ({activeComplaintForResolve.order.student.name}):
                </span>
                <p className="text-gray-600 italic leading-relaxed">
                  "{activeComplaintForResolve.description}"
                </p>
              </div>

              {/* Resolution Note Textarea */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Resolution Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={resolutionNoteText}
                  onChange={(e) => {
                    setResolutionNoteText(e.target.value);
                    if (resolveModalError && e.target.value.trim()) {
                      setResolveModalError(null);
                    }
                  }}
                  disabled={updateComplaintMutation.isPending}
                  placeholder="Explain the resolution provided (e.g., Located missing 2 shirts in section B-4; Delivered back to student's room; Refund initiated)..."
                  className="w-full p-3 border border-cream-300 rounded-xl text-sm focus:ring-2 focus:ring-maroon-700 outline-none transition"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  This note will be recorded permanently in the audit trail and visible to the student on their tracking page.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-cream-100">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  disabled={updateComplaintMutation.isPending}
                  className="px-4 py-2 border border-cream-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-cream-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateComplaintMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 disabled:bg-emerald-400 shadow-xs cursor-pointer"
                >
                  {updateComplaintMutation.isPending ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
