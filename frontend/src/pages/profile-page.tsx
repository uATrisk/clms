import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { useAuth } from '../contexts/auth-context';
import { AlertCircle, User, Loader2 } from 'lucide-react';
import { CampusFooter } from '../components/campus-footer';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const profileSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE'], { message: 'Please select a gender' }),
  bagNumber: z
    .string()
    .trim()
    .min(1, 'Bag Number is required')
    .regex(/^\d+$/, 'Enter numeric digits only (e.g. 101)'),
  mobileNumber: z.string().trim().regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid mobile number (e.g., 9876543210)'),
  collegeId: z.string().trim().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { token, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Where to redirect after saving profile
  const from = (location.state as any)?.from?.pathname || '/submit';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/students/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const profile = response.data.student;
        if (profile.gender) setValue('gender', profile.gender);
        if (profile.bagNumber) {
          const numericPart = profile.bagNumber.replace(/^(B-|G-)/i, '').trim();
          setValue('bagNumber', numericPart);
        }
        if (profile.mobileNumber) setValue('mobileNumber', profile.mobileNumber);
        if (profile.collegeId) setValue('collegeId', profile.collegeId);
      } catch (err: any) {
        console.error('Failed to fetch profile', err);
        setError('Failed to load profile data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [token, setValue]);

  const onSubmit = async (data: ProfileFormValues) => {
    setError(null);
    try {
      const response = await axios.patch(`${API_BASE_URL}/students/me`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedProfile = response.data.student;

      // Update local context user with new profile data
      if (user) {
        login(token as string, {
          ...user,
          bagNumber: updatedProfile.bagNumber,
          mobileNumber: updatedProfile.mobileNumber,
          collegeId: updatedProfile.collegeId
        });
      }

      // Navigate to intended destination
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to save profile. Please try again.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-maroon-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-cream-50 flex flex-col font-sans flex-1">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-cream-200 rounded-2xl shadow-xl overflow-hidden py-8 px-6 sm:px-8">
          <div className="text-center mb-6">
            <div className="mx-auto bg-cream-200 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-maroon-700" />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900">Your Profile</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Please complete your laundry profile. Your Bag Number and Mobile Number will be used for all future orders.
            </p>
          </div>

          {error && (
            <div className="w-full mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 border border-cream-300 rounded-lg cursor-pointer hover:bg-cream-100 transition-all has-[:checked]:border-maroon-700 has-[:checked]:bg-maroon-50 has-[:checked]:text-maroon-900">
                  <input
                    type="radio"
                    value="MALE"
                    {...register('gender')}
                    className="text-maroon-700 focus:ring-maroon-500 h-4 w-4"
                  />
                  <span className="text-sm font-medium">Male</span>
                </label>
                <label className="flex items-center gap-2 p-3 border border-cream-300 rounded-lg cursor-pointer hover:bg-cream-100 transition-all has-[:checked]:border-maroon-700 has-[:checked]:bg-maroon-50 has-[:checked]:text-maroon-900">
                  <input
                    type="radio"
                    value="FEMALE"
                    {...register('gender')}
                    className="text-maroon-700 focus:ring-maroon-500 h-4 w-4"
                  />
                  <span className="text-sm font-medium">Female</span>
                </label>
              </div>
              {errors.gender && (
                <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="bagNumber" className="block text-sm font-medium text-gray-700 mb-1">
                L-Sys Bag Number (numeric part only) <span className="text-red-500">*</span>
              </label>
              <input
                id="bagNumber"
                type="text"
                maxLength={20}
                {...register('bagNumber')}
                placeholder="e.g. 101"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                  errors.bagNumber
                    ? 'border-red-300 focus:ring-red-200 bg-red-50'
                    : 'border-cream-300 focus:ring-maroon-200 focus:border-maroon-700 bg-white'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Prefix (B- for Male, G- for Female) will be added automatically based on gender selected.
              </p>
              {errors.bagNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.bagNumber.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                id="mobileNumber"
                type="tel"
                maxLength={15}
                {...register('mobileNumber')}
                placeholder="e.g. 9876543210"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                  errors.mobileNumber
                    ? 'border-red-300 focus:ring-red-200 bg-red-50'
                    : 'border-cream-300 focus:ring-maroon-200 focus:border-maroon-700 bg-white'
                }`}
              />
              {errors.mobileNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.mobileNumber.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="collegeId" className="block text-sm font-medium text-gray-700 mb-1">
                College ID <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="collegeId"
                type="text"
                maxLength={30}
                {...register('collegeId')}
                placeholder="e.g. RU-123456"
                className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-maroon-200 focus:border-maroon-700 focus:outline-none transition-all bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-maroon-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-maroon-200 hover:bg-maroon-800 hover:shadow-maroon-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to={from} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              Cancel
            </Link>
          </div>
        </div>
      </main>
      <CampusFooter />
    </div>
  );
}
