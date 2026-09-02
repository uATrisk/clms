import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, CheckCircle2, ShoppingBag, AlertCircle, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/auth-context';

const submitSchema = z.object({
  selfReportedCount: z.coerce
    .number()
    .int('Item count must be an integer')
    .positive('Item count must be greater than 0')
});

type SubmitFormInput = z.input<typeof submitSchema>;
type SubmitFormOutput = z.output<typeof submitSchema>;

export default function SubmitPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [existingOrder, setExistingOrder] = useState<{ orderCode: string; status: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SubmitFormInput, unknown, SubmitFormOutput>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      selfReportedCount: '' as unknown as number
    }
  });

  const onSubmit = async (data: SubmitFormOutput) => {
    setServerError(null);
    setExistingOrder(null);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/orders`,
        { selfReportedCount: data.selfReportedCount },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const { order } = response.data;

      if (order && order.orderCode) {
        navigate(`/track/${order.orderCode}`);
      }
    } catch (error: any) {
      if (error.response?.status === 409 && error.response?.data?.error?.details?.orderCode) {
        setExistingOrder(error.response.data.error.details);
        setServerError(error.response?.data?.error?.message || 'You already have an active laundry request.');
      } else {
        const message =
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          error.message ||
          'An unexpected error occurred. Please try again.';
        setServerError(message);
      }
    }
  };

  return (
    <div className="bg-cream-50 flex flex-col font-sans flex-1">
      <div className="flex-1 flex flex-col items-center py-8 px-4 sm:px-6">
        <div className="w-full max-w-md bg-white border border-cream-200 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center text-maroon-700 mb-2">
            <Link to="/" className="flex items-center hover:underline focus:outline-none focus:underline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
          </div>

          <div>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Drop off Laundry</h1>
            <p className="text-gray-500 mt-1 text-sm leading-relaxed">
              Submit a new laundry request for Bag <span className="font-semibold text-gray-800">{user?.bagNumber}</span>.
            </p>
          </div>

          {/* Profile Quick Summary Card */}
          <div className="bg-maroon-50/70 border border-maroon-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-maroon-900">
            <div className="flex items-center gap-2.5">
              <div className="bg-maroon-700 text-white p-1.5 rounded-lg">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold">Bag #{user?.bagNumber}</p>
                <p className="text-maroon-800/80">{user?.email}</p>
              </div>
            </div>
            <Link
              to="/profile"
              state={{ from: { pathname: '/submit' } }}
              className="text-maroon-700 font-semibold hover:underline"
            >
              Change
            </Link>
          </div>

          {/* 409 Active Order Conflict Banner */}
          {existingOrder ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-amber-900">Active Order In Progress</h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {serverError || `You already have an active request (${existingOrder.orderCode}). Please wait until your bag is collected before dropping off a new one.`}
                  </p>
                </div>
              </div>
              <Link
                to={`/track/${existingOrder.orderCode}`}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <span>View Order #{existingOrder.orderCode}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            serverError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-1">
                    <p className="text-sm text-red-700 font-medium">{serverError}</p>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="selfReportedCount" className="block text-sm font-medium text-gray-700 mb-1">
                Number of items <span className="text-red-500">*</span>
              </label>
              <input
                id="selfReportedCount"
                type="number"
                min="1"
                {...register('selfReportedCount')}
                placeholder="e.g. 12"
                disabled={isSubmitting}
                className={`w-full p-3 border rounded-xl outline-none transition-all text-lg font-medium focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500 ${
                  errors.selfReportedCount
                    ? 'border-red-300 focus:ring-red-500 text-red-900'
                    : 'border-cream-300 focus:ring-maroon-700 focus:border-maroon-700'
                }`}
              />
              {errors.selfReportedCount && (
                <p className="mt-1 text-sm text-red-600">{errors.selfReportedCount.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Count all garments being dropped off in this bag.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-maroon-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-maroon-200 hover:bg-maroon-800 hover:shadow-maroon-300 disabled:bg-maroon-400 flex items-center justify-center transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Submit Laundry
                  </>
                )}
              </button>
              <p className="text-xs text-center text-gray-400 mt-3">
                By submitting, you confirm the item count is accurate.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
