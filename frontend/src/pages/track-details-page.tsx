import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

type OrderStatus =
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'PROCESSING'
  | 'DELAYED'
  | 'READY'
  | 'COLLECTED'
  | 'COMPLAINT_RAISED'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'CANCELLED';

interface TrackResponse {
  order: {
    id: string;
    orderCode: string;
    bagNumber: string;
    status: OrderStatus;
    selfReportedCount: number;
    verifiedCount: number | null;
    returnedCount: number | null;
    countMismatchFlag: boolean;
    submittedAt: string;
    acceptedAt: string | null;
    expectedReadyAt: string | null;
    actualReadyAt: string | null;
    collectedAt: string | null;
    collectionOtp?: string;
    student: {
      name: string;
      bagNumber: string;
      collegeId: string | null;
      maskedMobile: string;
    };
    timeline: Array<{
      fromStatus: OrderStatus | null;
      toStatus: OrderStatus;
      changedAt: string;
      note: string | null;
    }>;
  };
}

const LIFECYCLE_STEPS: OrderStatus[] = ['SUBMITTED', 'ACCEPTED', 'PROCESSING', 'READY', 'COLLECTED'];

export default function TrackDetailsPage() {
  const { orderCode } = useParams<{ orderCode: string }>();

  const { data, isLoading, isError, error } = useQuery<TrackResponse>({
    queryKey: ['order', orderCode],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:4000/api/orders/track/${orderCode}`);
      return res.data;
    },
    refetchInterval: 20000,
    retry: false
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-500 text-sm">Loading order details...</p>
      </div>
    );
  }

  if (isError || !data?.order) {
    const status = (error as any)?.response?.status;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">
            {status === 404 ? 'Order Not Found' : 'Something went wrong'}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {status === 404
              ? `We couldn't find an order with code "${orderCode}". Please check for typos and try again.`
              : 'Failed to fetch tracking details. Please try again later.'}
          </p>
          <Link
            to="/track"
            className="inline-block mt-4 bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const { order } = data;
  const currentStepIndex = LIFECYCLE_STEPS.indexOf(
    ['DELAYED', 'COMPLAINT_RAISED', 'UNDER_REVIEW', 'RESOLVED'].includes(order.status)
      ? 'PROCESSING'
      : order.status
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">

        <div className="flex items-center text-blue-600 mb-2">
          <Link to="/track" className="flex items-center hover:underline focus:outline-none focus:underline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">Track another</span>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 uppercase">{order.orderCode}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Status: <span className="font-semibold text-gray-800">{order.status.replace('_', ' ')}</span>
          </p>
        </div>

        {/* Status Stepper */}
        <div className="py-4">
          <div className="relative flex justify-between">
            {/* Background line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2" />

            {/* Active line */}
            <div
              className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 transition-all duration-500"
              style={{ width: `${(Math.max(0, currentStepIndex) / (LIFECYCLE_STEPS.length - 1)) * 100}%` }}
            />

            {LIFECYCLE_STEPS.map((step, idx) => {
              const isCompleted = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step} className="relative flex flex-col items-center group">
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCompleted ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-400"
                  )}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                  </div>
                  <span className={clsx(
                    "absolute -bottom-6 text-[10px] font-medium tracking-wide uppercase whitespace-nowrap",
                    isCurrent ? "text-blue-700" : (isCompleted ? "text-gray-700" : "text-gray-400")
                  )}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Expected ready</span>
            <span className="font-medium text-gray-900">
              {order.expectedReadyAt ? new Date(order.expectedReadyAt).toLocaleDateString() : 'TBD'}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Bag Number</span>
            <span className="font-medium text-gray-900 uppercase">{order.bagNumber}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Mobile Number</span>
            <span className="font-medium text-gray-900">{order.student.maskedMobile}</span>
          </div>

          {order.selfReportedCount && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Submitted Items</span>
              <span className="font-medium text-gray-900">{order.selfReportedCount}</span>
            </div>
          )}
        </div>

        {/* Collection OTP Banner */}
        {order.status === 'READY' && order.collectionOtp && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5 text-center shadow-sm">
            <p className="text-sm font-medium text-green-800 uppercase tracking-wide">
              Collection OTP
            </p>
            <div className="mt-2 text-3xl font-bold tracking-widest text-green-700">
              {order.collectionOtp}
            </div>
            <p className="mt-2 text-xs text-green-600/80">
              Share this PIN with staff to collect your laundry.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
