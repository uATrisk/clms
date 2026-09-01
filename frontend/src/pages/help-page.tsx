import { useState } from 'react';
import { AppShell } from '../components/app-shell';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  MessageSquare,
  ChevronDown,
  LifeBuoy
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...args: (string | undefined | null | false)[]) {
  return twMerge(clsx(args));
}

const FAQS = [
  {
    question: "How do I submit laundry?",
    answer: "Put your clothes in your assigned laundry bag, count the items, and enter this self-reported count on the 'Submit New Laundry' page. Once submitted, simply drop off your bag at the collection counter."
  },
  {
    question: "What do the different order status stages mean?",
    answer: (
      <ul className="list-disc pl-5 space-y-1 mt-1 text-sm sm:text-base">
        <li><strong>Received (SUBMITTED):</strong> Request created, waiting for washer pickup.</li>
        <li><strong>Sorting/Accepted (ACCEPTED):</strong> Washer has physically received your bag and begun processing.</li>
        <li><strong>Washing/Processing (PROCESSING):</strong> Your clothes are being washed, dried, or pressed.</li>
        <li><strong>Ready for Pickup (READY):</strong> Your clothes are ready and a collection OTP has been generated.</li>
      </ul>
    )
  },
  {
    question: "What happens if my clothes count doesn't match?",
    answer: "When the laundry staff physically counts your items, if their verified count differs from your self-reported count, a 'count mismatch' flag is automatically recorded on your order timeline for transparency."
  },
  {
    question: "How do I collect my laundry?",
    answer: "When your order reaches the 'Ready for Pickup' stage, a secure collection OTP is generated on your tracking screen. Provide this OTP to the staff at the collection desk when picking up your bag to verify the handover."
  },
  {
    question: "How do I raise a complaint for missing or damaged items?",
    answer: "Navigate to your order tracking page and click 'Raise Complaint'. You can select a category (like Missing, Damaged, or Wrong Count), provide a detailed description, and submit. The administration will review and resolve the issue."
  },
  {
    question: "Can I submit more than one laundry bag at a time?",
    answer: "Students can only have one active (in-flight) laundry order at a time. Once your current order is marked as 'Collected', you will be able to submit a new laundry request."
  },
  {
    question: "How long does washing and processing typically take?",
    answer: "Expected pickup dates and ETAs are set by the laundry staff upon accepting your bag. You can track this estimated completion date dynamically on your active tracking screen."
  }
];

export default function HelpPage() {
  const [openId, setOpenId] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenId(openId === idx ? null : idx);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-8 w-full animate-fade-in">
        {/* Header Title Section */}
        <div className="flex flex-col gap-4 border-b border-cream-200 pb-5 text-center sm:text-left">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-maroon-900 tracking-tight flex items-center justify-center sm:justify-start gap-3">
              <HelpCircle className="w-8 h-8 sm:w-10 sm:h-10 text-maroon-700" />
              Help Center
            </h1>
            <p className="text-gray-500 text-sm sm:text-base max-w-2xl">
               Find answers to common questions about submitting, tracking, and collecting your laundry securely.
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden text-left">
          {FAQS.map((faq, idx) => {
            const isOpen = openId === idx;
            return (
              <div
                key={idx}
                className={cx(
                  "border-b border-cream-100 last:border-b-0",
                  isOpen ? "bg-cream-50/30" : "hover:bg-cream-50/50 transition-colors"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus-visible:bg-cream-50 cursor-pointer"
                >
                  <span className="font-semibold text-gray-900 pr-4 text-sm sm:text-base">{faq.question}</span>
                  <ChevronDown className={cx(
                    "w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300",
                    isOpen && "rotate-180 text-maroon-600"
                  )} />
                </button>
                <div
                  className={cx(
                    "px-6 overflow-hidden transition-all duration-300 ease-in-out",
                    isOpen ? "max-h-[500px] pb-5 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="text-gray-600 text-sm sm:text-base leading-relaxed pl-3 sm:pl-4 border-l-2 border-maroon-200">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Still need help? */}
        <div className="mt-4 bg-maroon-50 rounded-2xl p-6 sm:p-8 border border-maroon-100 flex flex-col sm:flex-row items-center gap-6 justify-between text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 border border-maroon-200 shadow-sm text-maroon-700 mt-1 sm:mt-0">
               <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-maroon-900">Still need help?</h3>
              <p className="text-gray-600 text-sm mt-1.5 max-w-md leading-relaxed">
                Visit the Laundry Collection Desk at the Ground Floor or reach out to your Hostel Warden or Admin office for urgent queries regarding lost items or delays.
              </p>
            </div>
          </div>

          <Link
            to="/track"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-maroon-800 font-semibold text-sm rounded-xl hover:bg-cream-50 transition-all shadow-sm border border-maroon-200 hover:shadow active:scale-95 whitespace-nowrap"
          >
             <MessageSquare className="w-4 h-4" />
             Go to My Laundry
          </Link>
        </div>

      </div>
    </AppShell>
  );
}