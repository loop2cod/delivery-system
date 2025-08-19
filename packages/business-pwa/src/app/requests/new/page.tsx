'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness } from '@/providers/BusinessProvider';
import { BusinessLayout } from '@/components/layout/BusinessLayout';
import { NewRequestForm } from '@/components/requests/NewRequestForm';
import { businessAPI } from '@/lib/api';
import { toast } from '@/lib/toast';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';


export default function NewRequestPage() {
  const { isAuthenticated, isLoading, user } = useBusiness();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = async (data: any) => {
    console.log('Received form data:', data);
    setIsSubmitting(true);
    
    try {
      console.log('Submitting delivery request:', {
        ...data,
        companyId: user?.company.id,
        submittedBy: `${user?.firstName} ${user?.lastName}`
      });
      
      // Submit to backend API
      const response = await businessAPI.createRequest(data);
      
      toast.success(`Delivery request ${response.requestNumber} submitted successfully!`);
      
      // Redirect to request details or dashboard
      router.push(`/requests`);
    } catch (error: any) {
      console.error('Failed to submit request:', error);
      const message = error.response?.data?.error || error.message || 'Failed to submit request. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                New Delivery Request
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Create a new delivery request for {user?.company?.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Tips for a successful delivery request
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Provide complete and accurate addresses including building names and floor numbers</li>
                  <li>Include contact phone numbers for both pickup and delivery locations</li>
                  <li>Mark items as fragile if they require special handling</li>
                  <li>Allow sufficient time between pickup and delivery dates</li>
                  <li>Add special instructions for access codes or specific delivery requirements</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white shadow-sm rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.company?.name?.charAt(0) || 'C'}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user?.company?.name}</p>
                <p className="text-sm text-gray-500">{user?.company?.industry}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Request created by: {user?.firstName} {user?.lastName}</p>
              <p>Role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <NewRequestForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />

        {/* Help Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Need Help?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Call Support</h4>
              <p className="text-sm text-gray-600 mt-1">+971-800-123456</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Live Chat</h4>
              <p className="text-sm text-gray-600 mt-1">Available 24/7</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Help Center</h4>
              <p className="text-sm text-gray-600 mt-1">Browse FAQs</p>
            </div>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}