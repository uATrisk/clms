import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Loader2, PlusCircle, Search, Inbox, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';

export default function TrackPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['my-active-order', token],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/orders/my-active`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (data?.order?.orderCode) {
      navigate(`/track/${data.order.orderCode}`, { replace: true });
    }
  }, [data, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-maroon-700 animate-spin" />
        <p className="mt-4 text-gray-500 text-sm">Checking for active laundry orders...</p>
      </div>
    );
  }

  // 404 or no active order found
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-cream-200 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 text-center space-y-6">
        <div className="flex items-center text-maroon-700 mb-2">
          <Link to="/" className="flex items-center hover:underline focus:outline-none focus:underline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
        </div>

        <div className="mx-auto bg-maroon-50 w-16 h-16 rounded-full flex items-center justify-center">
          <Inbox className="w-8 h-8 text-maroon-700" />
        </div>

        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900">No Active Orders</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            You don't have an active laundry request right now. Drop off a bag to get started!
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            to="/submit"
            className="w-full bg-maroon-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-maroon-200 hover:bg-maroon-800 hover:shadow-maroon-300 flex items-center justify-center transition-all"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Submit New Laundry
          </Link>

          <div className="pt-2">
            <Link
              to="/track/search"
              className="text-sm text-gray-500 hover:text-maroon-700 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <Search className="w-4 h-4" />
              Track a different order by code
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
