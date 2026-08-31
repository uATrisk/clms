import { Link } from 'react-router-dom';
import { Shirt, Search, PlusCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header Branding */}
        <div className="bg-blue-600 p-8 text-center text-white">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Shirt className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">College Laundry</h1>
          <p className="text-blue-100 mt-2 text-sm">Management System</p>
        </div>

        {/* Action Buttons */}
        <div className="p-6 space-y-4">
          <p className="text-center text-gray-500 mb-6 text-sm">
            No registration required. Just submit and track.
          </p>

          <Link
            to="/track"
            className="flex items-center p-4 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors group"
          >
            <div className="bg-blue-100 p-3 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Track My Laundry</h2>
              <p className="text-sm text-gray-500">Check the active status of your bag</p>
            </div>
          </Link>

          <Link
            to="/submit"
            className="flex items-center p-4 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors group"
          >
            <div className="bg-blue-100 p-3 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
              <PlusCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Submit New Laundry</h2>
              <p className="text-sm text-gray-500">Drop off a new bag for washing</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
