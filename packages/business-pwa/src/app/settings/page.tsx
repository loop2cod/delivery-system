'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from '@/lib/toast';
import { LockClosedIcon, UserIcon, KeyIcon, CogIcon } from '@heroicons/react/24/outline';
import { BusinessLayout } from '@/components/layout/BusinessLayout';
import { api } from '@/lib/api';

interface PasswordChangeForm {
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<PasswordChangeForm>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: PasswordChangeForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/api/business/change-password', {
        newPassword: data.newPassword
      });
      
      toast.success('Password changed successfully');
      reset();
    } catch (error: any) {
      console.error('Failed to change password:', error);
      const message = error.response?.data?.error || 'Failed to change password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your account settings and preferences</p>
        </div>

        {/* Security Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <KeyIcon className="h-5 w-5 mr-2" />
            Security Settings
          </h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Change Password</h4>
              <p className="text-sm text-gray-500 mb-4">Update your account password to keep it secure</p>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      {...register('newPassword', {
                        required: 'New password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters'
                        }
                      })}
                      type="password"
                      id="newPassword"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder="Enter your new password"
                    />
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      {...register('confirmPassword', {
                        required: 'Please confirm your new password',
                        validate: (value) => 
                          value === newPassword || 'Passwords do not match'
                      })}
                      type="password"
                      id="confirmPassword"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder="Confirm your new password"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Password must be at least 8 characters long
                </p>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Account Information
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Profile Details</h4>
              <p className="text-sm text-gray-500 mt-1">
                View and update your account information in the{' '}
                <a href="/profile" className="text-primary hover:text-primary/80 font-medium">
                  Company Profile
                </a>{' '}
                section.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-900">User Role</h4>
              <p className="text-sm text-gray-500 mt-1">Business User</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CogIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Account Settings
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>
                  Keep your account secure by regularly updating your password. For additional account settings, 
                  visit your company profile page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}