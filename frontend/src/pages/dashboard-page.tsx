import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/auth-context';
import { AppShell } from '../components/app-shell';
import {
  Sparkles,
  Search,
  PlusCircle,
  Inbox,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...args: (string | undefined | null | false)[]) {
  return twMerge(clsx(args));
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Received',
  ACCEPTED: 'Sorting/Accepted',
  PROCESSING: 'Washing/Processing',
  READY: 'Ready for Pickup',
  COLLECTED: 'Collected'
};

const getStatusLabel = (status: string) => {
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
};

export default function DashboardPage() {
  const { user, token } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['my-active-order-dashboard', token],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/orders/my-active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    },
    retry: false,
  });

  const order = data?.order;
  const isDelayed = order?.status === 'DELAYED';

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-10 w-full animate-fade-in">

        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-maroon-800 via-maroon-700 to-maroon-900 shadow-xl border border-maroon-600/50">
          {/* Abstract geometric background elements */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="diagonal-stripes" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="20" height="40" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#diagonal-stripes)" className="text-amber-100" />
            </svg>
          </div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-maroon-400/20 rounded-full blur-3xl"></div>

          <div className="relative z-10 p-8 sm:p-12 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-cream-50 leading-tight">
                Welcome back, {user?.name?.split(' ')[0] || 'Student'}!
              </h1>
              <p className="text-cream-200/90 text-sm sm:text-base font-medium max-w-xl">
                We take care of your laundry so you can focus on what matters most.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <Sparkles className="w-12 h-12 text-amber-200 opacity-90" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

          {/* Main Column: Active Order Status */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <h2 className="font-serif text-2xl font-bold text-maroon-900 border-b border-cream-200 pb-3">
              Your Laundry Bag Status
            </h2>

            {isLoading ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-cream-200 flex flex-col items-center justify-center min-h-[300px] gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-maroon-100 border-t-maroon-700 animate-spin"></div>
                <p className="text-gray-500 font-medium text-sm animate-pulse">Fetching your laundry status...</p>
              </div>
            ) : order ? (
              <div className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden transition-all duration-300">
                <div className="bg-gradient-to-r from-cream-100 to-white px-6 py-5 border-b border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-maroon-50 text-maroon-800 rounded-xl flex items-center justify-center font-bold font-serif text-xl border border-maroon-100 shadow-inner">
                      #{order.bagNumber}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Active Request</p>
                      <p className="font-medium text-gray-900">{order.orderCode}</p>
                    </div>
                  </div>
                  <div className="auto-cols-max">
                    <span className={cx(
                      "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border shadow-xs inline-flex items-center gap-1.5",
                      isDelayed ? "bg-red-50 text-red-700 border-red-200"
                      : order.status === 'READY' ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-maroon-50 text-maroon-700 border-maroon-200"
                    )}>
                      {isDelayed && <AlertCircle className="w-3.5 h-3.5" />}
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  {/* Current Status Display */}
                  <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Status</p>
                    <div className="inline-flex items-center px-6 py-2.5 rounded-full bg-maroon-700 text-white font-serif font-bold text-lg sm:text-xl shadow-sm">
                      {getStatusLabel(order.status)}
                    </div>
                  </div>

                  <div className="flex justify-center mt-6 pt-6 border-t border-cream-100">
                    <Link
                      to={`/track/${order.orderCode}`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-cream-300 rounded-xl text-maroon-700 font-medium hover:bg-cream-50 hover:border-maroon-200 transition-all shadow-sm hover:shadow active:scale-95 group focus:outline-none focus:ring-2 focus:ring-maroon-500/30"
                    >
                      View Order Tracking & Timeline
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-cream-200 text-center flex flex-col items-center gap-5 transition-all w-full">
                <div className="w-20 h-20 bg-cream-100 rounded-full flex items-center justify-center text-maroon-300 mb-2 ring-8 ring-cream-50">
                  <Inbox className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 mb-2">No Active Laundry</h3>
                  <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                    You don't have any pending laundry requests right now. Drop off your laundry bag to get started.
                  </p>
                </div>
                <Link
                  to="/submit"
                  className="mt-4 inline-flex items-center gap-2 px-8 py-3.5 bg-maroon-700 text-white font-semibold rounded-xl hover:bg-maroon-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:ring-offset-2"
                >
                  <PlusCircle className="w-5 h-5" />
                  Submit New Laundry
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: What would you like to do action cards */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <h2 className="font-serif text-2xl font-bold text-maroon-900 border-b border-cream-200 pb-3">
              What would you like to do?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <Link
                to="/track"
                className="group p-5 bg-white rounded-2xl border border-cream-200 shadow-sm hover:shadow-md hover:border-maroon-200 transition-all flex items-start gap-4 hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-maroon-500/30"
              >
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-1.5 group-hover:text-maroon-700 transition-colors">
                    Track Laundry
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                    Check the active status of your bag and estimated pickup time.
                  </p>
                </div>
              </Link>

              <Link
                to="/submit"
                className="group p-5 bg-white rounded-2xl border border-cream-200 shadow-sm hover:shadow-md hover:border-maroon-200 transition-all flex items-start gap-4 hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-maroon-500/30"
              >
                <div className="w-12 h-12 bg-maroon-50 text-maroon-700 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-1.5 group-hover:text-maroon-700 transition-colors">
                    Submit New Laundry
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                    Drop off a new laundry bag at the collection point.
                  </p>
                </div>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
