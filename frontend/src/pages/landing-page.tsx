import { Link } from 'react-router-dom';
import { Search, PlusCircle } from 'lucide-react';
import { CampusFooter } from '../components/campus-footer';

export default function LandingPage() {
  return (
    <div className="flex-1 bg-cream-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-10 max-w-2xl px-2">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 sm:w-12 bg-maroon-300" />
            <span className="text-xs sm:text-sm font-semibold tracking-widest text-maroon-700 uppercase">
              RISHIHOOD UNIVERSITY
            </span>
            <div className="h-px w-8 sm:w-12 bg-maroon-300" />
          </div>

          {/* Main Headline */}
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-center mt-3">
            <span className="text-gray-900">Fresh Clothes, </span>
            <span className="text-maroon-700">Brighter Days</span>
          </h2>

          {/* Subtext */}
          <p className="text-sm sm:text-base text-gray-500 text-center mt-2.5">
            A clean campus for a brighter tomorrow.
          </p>
        </div>

        {/* Existing Card */}
        <div className="w-full max-w-md bg-cream-50 rounded-2xl p-6 sm:p-8">
          {/* Action Buttons */}
          <div className="space-y-3.5">
            <Link
              to="/track"
              className="group flex items-center p-4 bg-white border border-cream-200 rounded-xl shadow-sm hover:shadow-md hover:border-maroon-200 transition-all hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-maroon-500/30"
            >
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 mr-4 group-hover:scale-110 transition-transform duration-300">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-maroon-700 transition-colors">Track My Laundry</h2>
                <p className="text-sm text-gray-500">Check the active status of your bag</p>
              </div>
            </Link>

            <Link
              to="/submit"
              className="group flex items-center p-4 bg-white border border-cream-200 rounded-xl shadow-sm hover:shadow-md hover:border-maroon-200 transition-all hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-maroon-500/30"
            >
              <div className="w-12 h-12 bg-maroon-50 text-maroon-700 rounded-xl flex items-center justify-center shrink-0 mr-4 group-hover:scale-110 transition-transform duration-300">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-maroon-700 transition-colors">Submit New Laundry</h2>
                <p className="text-sm text-gray-500">Drop off a new bag for washing</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
      <CampusFooter />
    </div>
  );
}
