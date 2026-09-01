import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/auth-context';
import { AppShell } from '../components/app-shell';
import {
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  createdBy?: {
    name: string;
    role: string;
  } | null;
}

interface AnnouncementsResponse {
  announcements: Announcement[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export default function AnnouncementsPage() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<AnnouncementsResponse>({
    queryKey: ['announcements', token, page],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/announcements?page=${page}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const announcements = data?.announcements || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-8 w-full animate-fade-in">
        {/* Header Title Section */}
        <div className="flex flex-col gap-4 border-b border-cream-200 pb-5 text-center sm:text-left">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-maroon-900 tracking-tight flex items-center justify-center sm:justify-start gap-3">
              <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-maroon-700" />
              Announcements
            </h1>
            <p className="text-gray-500 text-sm sm:text-base max-w-2xl">
               Stay updated with the latest news, notices, and operational changes from the laundry administration.
            </p>
          </div>
        </div>

        {/* Content Section */}
        {isLoading && announcements.length === 0 ? (
          /* Loading Skeletons */
          <div className="flex flex-col gap-5">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="bg-white rounded-2xl p-6 shadow-sm border border-cream-200 animate-pulse flex flex-col gap-4"
              >
                <div className="h-6 w-3/4 bg-cream-200 rounded-md"></div>
                <div className="h-4 w-1/3 bg-cream-100 rounded-md"></div>
                <div className="space-y-2 mt-4">
                  <div className="h-4 w-full bg-cream-100 rounded"></div>
                  <div className="h-4 w-full bg-cream-100 rounded"></div>
                  <div className="h-4 w-2/3 bg-cream-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl p-8 sm:p-14 shadow-sm border border-cream-200 text-center flex flex-col items-center gap-5 my-4">
            <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center text-maroon-400 ring-8 ring-cream-50">
              <Bell className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-gray-900">
                No Announcements Yet
              </h3>
              <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                There are no current announcements from the administration. Check back later for updates.
              </p>
            </div>
          </div>
        ) : (
          /* Populated Announcements List */
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
              <span>{pagination?.totalCount || announcements.length} total announcements</span>
              {totalPages > 1 && (
                <span>
                  Page {pagination?.page || 1} of {totalPages}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-5">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-cream-200 hover:border-maroon-200 transition-all flex flex-col gap-4 group"
                >
                  {/* Announcement Header */}
                  <div className="flex flex-col gap-2 border-b border-cream-100 pb-4">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-gray-900">
                      {announcement.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500 font-medium mt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-maroon-600" />
                        {formatDate(announcement.createdAt)}
                      </div>

                      {announcement.createdBy && announcement.createdBy.name && (
                        <div className="flex items-center gap-1.5 border-l border-cream-200 pl-4">
                          <UserIcon className="w-4 h-4 text-maroon-600" />
                          Posted by {announcement.createdBy.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Announcement Body */}
                  <div className="text-gray-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap mt-2">
                    {announcement.body}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-cream-200 pt-6 px-1 mt-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border border-cream-300 bg-white text-gray-700 hover:bg-cream-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <span className="text-xs sm:text-sm font-medium text-gray-600">
                  Page <span className="font-bold text-gray-900">{page}</span> of{' '}
                  <span className="font-bold text-gray-900">{totalPages}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border border-cream-300 bg-white text-gray-700 hover:bg-cream-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
