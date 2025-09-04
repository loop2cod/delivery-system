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
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface SubmissionError {
  type: 'validation' | 'network' | 'server' | 'business';
  message: string;
  field?: string;
}


export default function NewRequestPage() {
  const { isAuthenticated, isLoading, user } = useBusiness();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<SubmissionError | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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

  const parseSubmissionError = (error: any): SubmissionError => {
    // Network errors
    if (!error.response) {
      return {
        type: 'network',
        message: 'Unable to connect to server. Please check your internet connection and try again.'
      };
    }

    const status = error.response.status;
    const message = error.response.data?.error || error.response.data?.message || error.message;

    // Validation errors
    if (status === 400 || status === 422) {
      return {
        type: 'validation',
        message: message || 'Please check your form inputs and try again.',
        field: error.response.data?.field
      };
    }

    // Business logic errors
    if (status === 403 || status === 409) {
      return {
        type: 'business',
        message: message || 'Business rules validation failed. Please review your request.'
      };
    }

    // Server errors
    if (status >= 500) {
      return {
        type: 'server',
        message: 'Server error occurred. Our team has been notified. Please try again in a moment.'
      };
    }

    // Rate limiting
    if (status === 429) {
      return {
        type: 'server',
        message: 'Too many requests. Please wait a moment before trying again.'
      };
    }

    return {
      type: 'server',
      message: message || 'An unexpected error occurred. Please try again.'
    };
  };

  const handleSubmit = async (data: any) => {
    console.log('Received form data:', data);
    setIsSubmitting(true);
    setSubmissionError(null);
    setRetryCount(prev => prev + 1);
    
    try {
      console.log('Submitting delivery request:', {
        ...data,
        companyId: user?.company.id,
        submittedBy: `${user?.firstName} ${user?.lastName}`
      });
      
      // Submit to backend API
      const response = await businessAPI.createRequest(data);
      
      // Show success state
      setShowSuccessMessage(true);
      setRetryCount(0);
      
      toast.success('Request Submitted Successfully!', {
        description: `Request ${response.requestNumber} is now being processed`
      });
      
      // Delay redirect to show success message
      setTimeout(() => {
        router.push(`/requests`);
      }, 2000);
      
    } catch (error: any) {
      console.error('Failed to submit request:', error);
      const submissionError = parseSubmissionError(error);
      setSubmissionError(submissionError);
      
      // Show appropriate toast based on error type
      if (submissionError.type === 'network') {
        toast.error('Connection Failed', submissionError.message);
      } else if (submissionError.type === 'validation') {
        toast.error('Validation Error', submissionError.message);
      } else if (submissionError.type === 'business') {
        toast.warning('Business Rule Issue', submissionError.message);
      } else {
        toast.error('Submission Failed', 
          retryCount < 3 ? `${submissionError.message} (Attempt ${retryCount}/3)` : submissionError.message
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetrySubmit = () => {
    setSubmissionError(null);
    // The form will resubmit automatically
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <ErrorBoundary>
      <BusinessLayout>
        <div className="space-y-6">
          {/* Success Message */}
          {showSuccessMessage && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Request Submitted!
                </h3>
                <p className="text-gray-600 mb-4">
                  Your delivery request has been successfully submitted and is now being processed.
                </p>
                <div className="animate-spin w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">
                  Redirecting to your requests...
                </p>
              </div>
            </div>
          )}

          {/* Submission Error Display */}
          {submissionError && (
            <div className={`rounded-lg p-4 ${
              submissionError.type === 'network' || submissionError.type === 'server'
                ? 'bg-yellow-50 border border-yellow-200'
                : submissionError.type === 'business'
                ? 'bg-orange-50 border border-orange-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className={`h-5 w-5 ${
                    submissionError.type === 'network' || submissionError.type === 'server'
                      ? 'text-yellow-400'
                      : submissionError.type === 'business'
                      ? 'text-orange-400'
                      : 'text-red-400'
                  }`} />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className={`text-sm font-medium ${
                    submissionError.type === 'network' || submissionError.type === 'server'
                      ? 'text-yellow-800'
                      : submissionError.type === 'business'
                      ? 'text-orange-800'
                      : 'text-red-800'
                  }`}>
                    {submissionError.type === 'network' ? 'Connection Problem' :
                     submissionError.type === 'server' ? 'Server Error' :
                     submissionError.type === 'business' ? 'Business Rule Issue' :
                     'Validation Error'}
                  </h3>
                  <div className={`mt-1 text-sm ${
                    submissionError.type === 'network' || submissionError.type === 'server'
                      ? 'text-yellow-700'
                      : submissionError.type === 'business'
                      ? 'text-orange-700'
                      : 'text-red-700'
                  }`}>
                    <p>{submissionError.message}</p>
                    {retryCount > 0 && (
                      <p className="mt-1 text-xs opacity-75">
                        Attempt {retryCount}{retryCount >= 3 ? ' - Please contact support if issue persists' : ''}
                      </p>
                    )}
                    <div className="mt-2 space-x-2">
                      <button
                        type="button"
                        className="text-sm underline hover:no-underline focus:outline-none"
                        onClick={handleRetrySubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Retrying...' : 'Try Again'}
                      </button>
                      {submissionError.type === 'business' && (
                        <>
                          {' • '}
                          <a href="mailto:support@delivery-uae.com" className="text-sm underline hover:no-underline">
                            Contact Support
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* Quick Tips - Now collapsible */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <InformationCircleIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-900">
                  💡 Pro Tips for Successful Delivery
                </h3>
                <div className="mt-2 text-sm text-blue-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      <span>Complete addresses with building details</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      <span>Valid contact numbers for both locations</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      <span>Mark fragile items for special care</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      <span>Allow adequate time between dates</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Info - More compact and user-friendly */}
          <div className="bg-white shadow-sm rounded-lg p-4 border-l-4 border-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">
                    {user?.company?.name?.charAt(0) || 'C'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user?.company?.name}</p>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {user?.company?.industry || 'Business'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p className="font-medium">Created by: {user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <NewRequestForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            submissionError={submissionError}
            onRetry={handleRetrySubmit}
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
    </ErrorBoundary>
  );
}