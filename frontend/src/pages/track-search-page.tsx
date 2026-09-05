import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import { CampusFooter } from '../components/campus-footer';

export default function TrackSearchPage() {
  const [orderCode, setOrderCode] = useState('');
  const navigate = useNavigate();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderCode.trim()) {
      navigate(`/track/${orderCode.trim()}`);
    }
  };

  return (
    <div className="flex-1 bg-cream-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-cream-200 rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
          <div className="flex items-center text-maroon-700 mb-2">
            <Link to="/" className="flex items-center hover:underline">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Back</span>
            </Link>
          </div>

          <div>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Track Laundry</h1>
            <p className="text-gray-500 mt-2 text-sm">Enter the order code you received via SMS to check the current status.</p>
          </div>

          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label htmlFor="orderCode" className="block text-sm font-medium text-gray-700 mb-1">
                Order Code
              </label>
              <input
                type="text"
                id="orderCode"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="e.g. LN-8842-A3B9"
                className="w-full border border-cream-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-maroon-700 focus:border-maroon-700 outline-none transition-all uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={!orderCode.trim()}
              className="w-full bg-maroon-700 text-white font-semibold py-3 rounded-lg hover:bg-maroon-800 disabled:bg-maroon-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-xs"
            >
              <Search className="w-5 h-5 mr-2" />
              Track Request
            </button>
          </form>
        </div>
      </div>
      <CampusFooter />
    </div>
  );
}
