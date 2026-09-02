import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/auth-context';

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

type ComplaintCategory =
  | 'MISSING'
  | 'DAMAGED'
  | 'WRONG_COUNT'
  | 'WRONG_BAG'
  | 'NOT_READY'
  | 'OTHER';

type ComplaintStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';

interface Complaint {
  id: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  raisedAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

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
    complaints?: Complaint[];
  };
}

const LIFECYCLE_STEPS: OrderStatus[] = [
  'SUBMITTED',
  'ACCEPTED',
  'PROCESSING',
  'READY',
  'COLLECTED',
];

const COMPLAINT_CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: 'MISSING', label: 'Missing Clothes / Items' },
  { value: 'DAMAGED', label: 'Damaged Clothes' },
  { value: 'WRONG_COUNT', label: 'Wrong Item Count' },
  { value: 'WRONG_BAG', label: 'Wrong Bag Received' },
  { value: 'NOT_READY', label: 'Not Ready / Delayed' },
  { value: 'OTHER', label: 'Other Issue' },
];

function getComplaintStatusBadge(status: ComplaintStatus) {
  switch (status) {
    case 'OPEN':
      return {
        label: 'Open',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'UNDER_REVIEW':
      return {
        label: 'Under Review',
        className: 'bg-blue-50 text-maroon-800 border-blue-200',
      };
    case 'RESOLVED':
      return {
        label: 'Resolved',
        className: 'bg-green-50 text-green-700 border-green-200',
      };
    case 'ESCALATED':
      return {
        label: 'Escalated',
        className: 'bg-red-50 text-red-700 border-red-200',
      };
    default:
      return {
        label: status,
        className: 'bg-cream-50 text-gray-700 border-cream-200',
      };
  }
}

function getCategoryLabel(category: ComplaintCategory) {
  const found = COMPLAINT_CATEGORIES.find((c) => c.value === category);
  return found ? found.label : category;
}

export default function TrackDetailsPage() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<ComplaintCategory>('MISSING');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<TrackResponse>({
    queryKey: ['order', orderCode, token],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/orders/track/${orderCode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    refetchInterval: 20000,
    retry: false,
  });

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    if (validationError && val.trim().length >= 10) {
      setValidationError(null);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (trimmed.length < 10) {
      setValidationError('Description must be at least 10 characters long.');
      return;
    }

    setValidationError(null);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/orders/${orderCode}/complaint`,
        {
          category,
          description: trimmed,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setIsModalOpen(false);
      setDescription('');
      setCategory('MISSING');
      setSuccessMessage('Your issue has been reported. Our team will review it shortly.');
      await queryClient.invalidateQueries({ queryKey: ['order', orderCode, token] });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to report issue. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-maroon-700 animate-spin" />
        <p className="mt-4 text-gray-500 text-sm">Loading order details...</p>
      </div>
    );
  }

  if (isError || !data?.order) {
    const status = (error as any)?.response?.status;
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-md bg-white border border-cream-200 rounded-2xl shadow p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="font-serif text-xl font-bold text-gray-900">
            {status === 403
              ? 'Access Denied'
              : status === 404
              ? 'Order Not Found'
              : 'Something went wrong'}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {status === 403
              ? 'You do not have permission to view this order. You can only track orders placed by your account.'
              : status === 404
              ? `We couldn't find an order with code "${orderCode}". Please check for typos and try again.`
              : 'Failed to fetch tracking details. Please try again later.'}
          </p>
          <Link
            to="/track"
            className="inline-block mt-4 bg-maroon-700 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-maroon-800 transition"
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
    <div className="min-h-screen bg-cream-50 flex flex-col items-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-md bg-white border border-cream-200 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between text-maroon-700 mb-2">
          <Link
            to="/"
            className="flex items-center hover:underline focus:outline-none focus:underline"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">Home</span>
          </Link>
          <Link
            to="/track/search"
            className="text-xs text-gray-500 hover:text-maroon-700 font-medium transition-colors"
          >
            Search by code
          </Link>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start justify-between shadow-sm animate-fade-in">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800 font-medium leading-snug">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 ml-2 text-sm font-bold focus:outline-none"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        )}

        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-900 uppercase">{order.orderCode}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Status: <span className="font-semibold text-gray-800">{order.status.replace('_', ' ')}</span>
          </p>
        </div>

        {/* Status Stepper */}
        <div className="py-4">
          <div className="relative flex justify-between">
            {/* Background line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-cream-200 -translate-y-1/2" />

            {/* Active line */}
            <div
              className="absolute top-1/2 left-0 h-1 bg-maroon-700 -translate-y-1/2 transition-all duration-500"
              style={{
                width: `${(Math.max(0, currentStepIndex) / (LIFECYCLE_STEPS.length - 1)) * 100}%`,
              }}
            />

            {LIFECYCLE_STEPS.map((step, idx) => {
              const isCompleted = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step} className="relative flex flex-col items-center group">
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                      isCompleted
                        ? 'bg-maroon-700 border-maroon-700 text-white'
                        : 'bg-white border-cream-300 text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-current" />
                    )}
                  </div>
                  <span
                    className={clsx(
                      'absolute -bottom-6 text-[10px] font-medium tracking-wide uppercase whitespace-nowrap',
                      isCurrent ? 'text-maroon-800' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                    )}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        <div className="mt-8 pt-6 border-t border-cream-200 space-y-4">
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

        {/* Action Button: Report an Issue */}
        <div className="pt-4 border-t border-cream-200">
          <button
            type="button"
            onClick={() => {
              setValidationError(null);
              setSubmitError(null);
              setIsModalOpen(true);
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-900 text-sm font-medium transition flex items-center justify-center gap-2 shadow-sm"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Report an Issue
          </button>
        </div>

        {/* Complaints / Issues List */}
        {order.complaints && order.complaints.length > 0 && (
          <div className="mt-6 pt-6 border-t border-cream-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-gray-600" />
                Reported Issues ({order.complaints.length})
              </h2>
            </div>

            <div className="space-y-3">
              {order.complaints.map((complaint) => {
                const badge = getComplaintStatusBadge(complaint.status);
                return (
                  <div
                    key={complaint.id}
                    className="bg-cream-50 border border-cream-200 rounded-xl p-4 space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {getCategoryLabel(complaint.category)}
                      </span>
                      <span
                        className={clsx(
                          'text-xs px-2.5 py-0.5 rounded-full font-medium border',
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {complaint.description}
                    </p>

                    <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
                      <span>Reported on {new Date(complaint.raisedAt).toLocaleDateString()}</span>
                      {complaint.resolvedAt && (
                        <span>
                          Resolved on {new Date(complaint.resolvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {complaint.status === 'RESOLVED' && complaint.resolutionNote && (
                      <div className="mt-2.5 p-3 bg-green-50 border border-green-200 rounded-lg text-xs space-y-1">
                        <span className="font-semibold text-green-900 block">
                          Resolution Details:
                        </span>
                        <p className="text-green-800 leading-relaxed">
                          {complaint.resolutionNote}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Raise Complaint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-lg bg-white border border-cream-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-gray-900">Report an Issue</h2>
                  <p className="text-xs text-gray-500">Order #{order.orderCode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmitting) setIsModalOpen(false);
                }}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-cream-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-maroon-700 focus:outline-none focus:ring-1 focus:ring-maroon-700"
                >
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Issue Details
                  </label>
                  <span
                    className={clsx(
                      'text-[11px]',
                      description.trim().length >= 10
                        ? 'text-gray-400'
                        : 'text-amber-600 font-medium'
                    )}
                  >
                    {description.trim().length}/10 min chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={handleDescriptionChange}
                  disabled={isSubmitting}
                  placeholder="Please describe the issue in detail (e.g., missing 2 white shirts, broken zipper on hoodie)..."
                  className={clsx(
                    'w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-1 transition',
                    validationError
                      ? 'border-red-500 focus:border-red-600 focus:ring-red-600 bg-red-50/20'
                      : 'border-cream-300 focus:border-maroon-700 focus:ring-maroon-700 bg-white'
                  )}
                />
                {validationError && (
                  <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {validationError}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-cream-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Report</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
