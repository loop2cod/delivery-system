'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BusinessLayout } from '@/components/layout/BusinessLayout';
import { useBusiness } from '@/providers/BusinessProvider';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BuildingOffice2Icon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  KeyIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

const profileSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  contact_person: z.string().min(1, 'Contact person is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Valid email is required'),
  street_address: z.string().min(1, 'Street address is required'),
  area: z.string().min(1, 'Area is required'),
  city: z.string().min(1, 'City is required'),
  emirate: z.string().min(1, 'Emirate is required'),
  postal_code: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  industry: z.string().min(1, 'Industry is required'),
  monthly_volume_estimate: z.number().min(0, 'Volume estimate must be positive').optional(),
});

const passwordResetSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

interface Company {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  street_address: string;
  area: string;
  city: string;
  emirate: string;
  postal_code?: string;
  country: string;
  industry: string;
  monthly_volume_estimate?: number;
  created_at: string;
  updated_at: string;
}

const EMIRATES = [
  'DUBAI',
  'ABU_DHABI', 
  'SHARJAH',
  'AJMAN',
  'UMM_AL_QUWAIN',
  'RAS_AL_KHAIMAH',
  'FUJAIRAH'
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Marketing',
  'Food & Beverage',
  'Logistics',
  'Other'
];

export default function ProfilePage() {
  const { user } = useBusiness();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
  });

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/business/profile');
      const companyData = response.data.company;
      setCompany(companyData);
      
      // Reset form with company data
      reset({
        ...companyData,
        monthly_volume_estimate: companyData.monthly_volume_estimate || 0,
      });
    } catch (error) {
      console.error('Failed to load company profile:', error);
      toast.error('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setSaving(true);
      const response = await axios.put('/api/business/profile', data);
      const updatedCompany = response.data.company;
      setCompany(updatedCompany);
      setIsEditing(false);
      
      // Check if profile is now complete and trigger a context refresh
      const isProfileComplete = updatedCompany.street_address && 
                               updatedCompany.area && 
                               updatedCompany.city && 
                               updatedCompany.contact_person && 
                               updatedCompany.phone;
      
      if (isProfileComplete) {
        toast.success('Company profile updated successfully! You can now start creating delivery requests.');
        // Refresh the page to update the context
        window.location.reload();
      } else {
        toast.success('Company profile updated successfully');
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const message = error.response?.data?.error || 'Failed to update profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (company) {
      reset({
        ...company,
        monthly_volume_estimate: company.monthly_volume_estimate || 0,
      });
    }
    setIsEditing(false);
  };

  const onPasswordReset = async (data: PasswordResetFormData) => {
    console.log('dsdfd')
    try {
      setResettingPassword(true);
      
      const response = await axios.post('/api/business/reset-password', {
        newPassword: data.newPassword,
      });

      if(response.data.success){
        toast.success('Password reset successfully');
      setShowPasswordReset(false);
      resetPassword();
      }
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      const message = error.response?.data?.error || 'Failed to reset password';
      toast.error(message);
    } finally {
      setResettingPassword(false);
    }
  };

  const handlePasswordResetCancel = () => {
    setShowPasswordReset(false);
    resetPassword();
  };

  if (loading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </BusinessLayout>
    );
  }

  if (!company) {
    return (
      <BusinessLayout>
        <div className="text-center py-12">
          <BuildingOffice2Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Company profile not found</h2>
          <p className="text-gray-500">Unable to load your company profile.</p>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
            <p className="text-gray-500">Manage your company information and pickup details</p>
          </div>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={saving || !isDirty}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <CheckIcon className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <BuildingOffice2Icon className="h-5 w-5 mr-2" />
              Company Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                {isEditing ? (
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-900">{company.name}</p>
                )}
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                {isEditing ? (
                  <select
                    {...register('industry')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{company.industry}</p>
                )}
                {errors.industry && (
                  <p className="mt-1 text-sm text-red-600">{errors.industry.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Volume Estimate
                </label>
                {isEditing ? (
                  <input
                    {...register('monthly_volume_estimate', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="Number of deliveries per month"
                  />
                ) : (
                  <p className="text-gray-900">
                    {company.monthly_volume_estimate ? `${company.monthly_volume_estimate} deliveries/month` : 'Not specified'}
                  </p>
                )}
                {errors.monthly_volume_estimate && (
                  <p className="mt-1 text-sm text-red-600">{errors.monthly_volume_estimate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              Contact Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person
                </label>
                {isEditing ? (
                  <input
                    {...register('contact_person')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-900">{company.contact_person}</p>
                )}
                {errors.contact_person && (
                  <p className="mt-1 text-sm text-red-600">{errors.contact_person.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    {...register('phone')}
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {company.phone}
                  </p>
                )}
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    {company.email}
                  </p>
                )}
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2" />
              Address Information (Default Pickup Location)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                {isEditing ? (
                  <input
                    {...register('street_address')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-900">{company.street_address}</p>
                )}
                {errors.street_address && (
                  <p className="mt-1 text-sm text-red-600">{errors.street_address.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area
                </label>
                {isEditing ? (
                  <input
                    {...register('area')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-900">{company.area}</p>
                )}
                {errors.area && (
                  <p className="mt-1 text-sm text-red-600">{errors.area.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                {isEditing ? (
                  <input
                    {...register('city')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-900">{company.city}</p>
                )}
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emirate
                </label>
                {isEditing ? (
                  <select
                    {...register('emirate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select Emirate</option>
                    {EMIRATES.map((emirate) => (
                      <option key={emirate} value={emirate}>
                        {emirate.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{company.emirate.replace('_', ' ')}</p>
                )}
                {errors.emirate && (
                  <p className="mt-1 text-sm text-red-600">{errors.emirate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                {isEditing ? (
                  <input
                    {...register('postal_code')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-900">{company.postal_code || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                {isEditing ? (
                  <input
                    {...register('country')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-gray-900">{company.country}</p>
                )}
                {errors.country && (
                  <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <KeyIcon className="h-5 w-5 mr-2" />
              Security Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Password</h4>
                  <p className="text-sm text-gray-500">Change your account password</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <LockClosedIcon className="h-4 w-4 mr-2" />
                  Reset Password
                </button>
              </div>

              {/* Password Reset Modal/Form */}
              {showPasswordReset && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <LockClosedIcon className="h-5 w-5 mr-2" />
                      Reset Password
                    </h3>
                    
                    <form onSubmit={handlePasswordSubmit(onPasswordReset)} className="space-y-4">

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          {...registerPassword('newPassword')}
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        />
                        {passwordErrors.newPassword && (
                          <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          {...registerPassword('confirmPassword')}
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        />
                        {passwordErrors.confirmPassword && (
                          <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                        )}
                      </div>

                      <div className="flex justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={handlePasswordResetCancel}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={resettingPassword}
                          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resettingPassword ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                              Resetting...
                            </>
                          ) : (
                            'Reset Password'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <MapPinIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Default Pickup Location
                </h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>
                    The address information above will be used as your default pickup location for delivery requests. 
                    You can always override this when creating individual requests.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </BusinessLayout>
  );
}