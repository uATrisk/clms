import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

// Validation schema
const submitSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  collegeId: z.string().optional(),
  bagNumber: z.string().min(1, 'Bag number is required'),
  mobileNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid mobile number (e.g. 9876543210)'),
  selfReportedCount: z.coerce
    .number()
    .int('Item count must be an integer')
    .positive('Item count must be greater than 0')
});

type SubmitFormInput = z.input<typeof submitSchema>;
type SubmitFormOutput = z.output<typeof submitSchema>;

export default function SubmitPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SubmitFormInput, unknown, SubmitFormOutput>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      name: '',
      collegeId: '',
      bagNumber: '',
      mobileNumber: '',
      selfReportedCount: '' as unknown as number
    }
  });

  const onSubmit = async (data: SubmitFormOutput) => {
    setServerError(null);
    try {
      // Connect to backend api
      const response = await axios.post('http://localhost:4000/api/orders', data);
      const { order } = response.data;

      // On success, redirect to the track result page
      if (order && order.orderCode) {
        navigate(`/track/${order.orderCode}`);
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message
        || error.message
        || 'An unexpected error occurred. Please try again.';
      setServerError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center text-blue-600 mb-2">
          <Link to="/" className="flex items-center hover:underline focus:outline-none focus:underline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drop off Laundry</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Submit a new laundry request. You don't need an account—just your bag number and mobile number for verification.
          </p>
        </div>

        {/* Global Error Banner */}
        {serverError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex">
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">{serverError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              {...register('name')}
              placeholder="e.g. Alex Student"
              disabled={isSubmitting}
              className={`w-full p-2.5 border rounded-lg outline-none transition-all focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500 ${
                errors.name ? 'border-red-300 focus:ring-red-500 text-red-900' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Bag Number */}
            <div>
              <label htmlFor="bagNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Bag Number
              </label>
              <input
                id="bagNumber"
                {...register('bagNumber')}
                placeholder="e.g. BAG-320"
                disabled={isSubmitting}
                className={`w-full p-2.5 border rounded-lg outline-none transition-all uppercase focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500 ${
                  errors.bagNumber ? 'border-red-300 focus:ring-red-500 text-red-900' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {errors.bagNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.bagNumber.message}</p>
              )}
            </div>

            {/* College ID (Optional) */}
            <div>
              <label htmlFor="collegeId" className="block text-sm font-medium text-gray-700 mb-1">
                College ID <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="collegeId"
                {...register('collegeId')}
                placeholder="e.g. CS-2026"
                disabled={isSubmitting}
                className={`w-full p-2.5 border rounded-lg outline-none transition-all uppercase focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500 ${
                  errors.collegeId ? 'border-red-300 focus:ring-red-500 text-red-900' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {errors.collegeId && (
                <p className="mt-1 text-sm text-red-600">{errors.collegeId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Mobile Number */}
            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number
              </label>
              <input
                id="mobileNumber"
                type="tel"
                {...register('mobileNumber')}
                placeholder="+91..."
                disabled={isSubmitting}
                className={`w-full p-2.5 border rounded-lg outline-none transition-all focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500 ${
                  errors.mobileNumber ? 'border-red-300 focus:ring-red-500 text-red-900' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {errors.mobileNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.mobileNumber.message}</p>
              )}
            </div>

            {/* Self Reported Count */}
            <div>
              <label htmlFor="selfReportedCount" className="block text-sm font-medium text-gray-700 mb-1">
                Total Items
              </label>
              <input
                id="selfReportedCount"
                type="number"
                min="1"
                {...register('selfReportedCount')}
                placeholder="e.g. 15"
                disabled={isSubmitting}
                className={`w-full p-2.5 border rounded-lg outline-none transition-all focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500 ${
                  errors.selfReportedCount ? 'border-red-300 focus:ring-red-500 text-red-900' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {errors.selfReportedCount && (
                <p className="mt-1 text-sm text-red-600">{errors.selfReportedCount.message}</p>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center transition-colors"
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
            <p className="text-xs text-center text-gray-500 mt-4">
              By submitting, you confirm the provided counts are accurate.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
