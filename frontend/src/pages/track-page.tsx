import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';

export default function TrackPage() {
  const [orderCode, setOrderCode] = useState('');
  const navigate = useNavigate();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderCode.trim()) {
      navigate(`/track/${orderCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center text-blue-600 mb-2">
          <Link to="/" className="flex items-center hover:underline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Track Laundry</h1>
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
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={!orderCode.trim()}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Search className="w-5 h-5 mr-2" />
            Track Request
          </button>
        </form>
      </div>
    </div>
  );
}
