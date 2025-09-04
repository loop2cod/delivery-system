'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BuildingOfficeIcon } from '@heroicons/react/24/solid';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useBusiness } from '@/providers/BusinessProvider';
import { toast } from '@/lib/toast';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginError {
  type: 'validation' | 'authentication' | 'network' | 'server' | 'account';
  message: string;
  field?: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { login } = useBusiness();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError(null);
    setRetryCount(prev => prev + 1);
    
    try {
      await login(data.email, data.password);
      // Reset retry count on successful login
      setRetryCount(0);
    } catch (error: any) {
      const loginError = parseLoginError(error);
      setLoginError(loginError);
      
      // Show appropriate toast based on error type
      if (loginError.type === 'network') {
        toast.error('Connection Failed', 'Please check your internet connection and try again.');
      } else if (loginError.type === 'authentication') {
        toast.error('Login Failed', loginError.message);
      } else if (loginError.type === 'account') {
        toast.warning('Account Issue', loginError.message);
      } else if (loginError.type === 'server' && retryCount < 3) {
        toast.error('Server Error', `${loginError.message} (Attempt ${retryCount}/3)`);
      } else {
        toast.error('Login Error', loginError.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setLoginError(null);
    // Clear form errors
    const form = document.querySelector('form') as HTMLFormElement;
    if (form) {
      handleSubmit(onSubmit)();
    }
  };

  const parseLoginError = (error: any): LoginError => {
    // Network errors
    if (!error.response) {
      return {
        type: 'network',
        message: 'Unable to connect to the server. Please check your internet connection.'
      };
    }

    const status = error.response.status;
    const message = error.response.data?.message || error.message || 'An unexpected error occurred';

    // Authentication errors
    if (status === 401) {
      if (message.toLowerCase().includes('invalid credentials') || 
          message.toLowerCase().includes('email') || 
          message.toLowerCase().includes('password')) {
        return {
          type: 'authentication',
          message: 'Invalid email or password. Please check your credentials and try again.'
        };
      }
      return {
        type: 'authentication',
        message: 'Authentication failed. Please try again.'
      };
    }

    // Account-related errors
    if (status === 403) {
      if (message.toLowerCase().includes('business') || 
          message.toLowerCase().includes('authorized')) {
        return {
          type: 'account',
          message: 'This account is not authorized for business access. Please contact support.'
        };
      }
      if (message.toLowerCase().includes('suspended') || 
          message.toLowerCase().includes('disabled')) {
        return {
          type: 'account',
          message: 'Your account has been suspended. Please contact support for assistance.'
        };
      }
      return {
        type: 'account',
        message: 'Access denied. Please contact support for assistance.'
      };
    }

    // Validation errors
    if (status === 422 || status === 400) {
      return {
        type: 'validation',
        message: message || 'Please check your input and try again.'
      };
    }

    // Server errors
    if (status >= 500) {
      return {
        type: 'server',
        message: 'Server error occurred. Please try again in a moment.'
      };
    }

    // Rate limiting
    if (status === 429) {
      return {
        type: 'authentication',
        message: 'Too many login attempts. Please wait a moment before trying again.'
      };
    }

    // Default error
    return {
      type: 'server',
      message: message || 'An unexpected error occurred. Please try again.'
    };
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-primary rounded-2xl flex items-center justify-center">
            <BuildingOfficeIcon className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Business Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            UAE Delivery Management System
          </p>
          <div className="mt-4 text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <BuildingOfficeIcon className="h-3 w-3 mr-1" />
              For Business Customers
            </div>
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:z-10 sm:text-sm ${
                  errors.email || (loginError?.type === 'authentication' || loginError?.type === 'validation')
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-primary focus:border-primary'
                }`}
                placeholder="Company email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:z-10 sm:text-sm ${
                  errors.password || (loginError?.type === 'authentication' || loginError?.type === 'validation')
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-primary focus:border-primary'
                }`}
                placeholder="Password"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Login Error Display */}
          {loginError && (
            <div className={`rounded-md p-4 ${
              loginError.type === 'network' || loginError.type === 'server' 
                ? 'bg-yellow-50 border border-yellow-200' 
                : loginError.type === 'account'
                ? 'bg-orange-50 border border-orange-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className={`h-5 w-5 ${
                    loginError.type === 'network' || loginError.type === 'server'
                      ? 'text-yellow-400'
                      : loginError.type === 'account'
                      ? 'text-orange-400' 
                      : 'text-red-400'
                  }`} />
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    loginError.type === 'network' || loginError.type === 'server'
                      ? 'text-yellow-800'
                      : loginError.type === 'account'
                      ? 'text-orange-800'
                      : 'text-red-800'
                  }`}>
                    {loginError.type === 'network' ? 'Connection Problem' :
                     loginError.type === 'server' ? 'Server Error' :
                     loginError.type === 'account' ? 'Account Issue' :
                     loginError.type === 'authentication' ? 'Login Failed' :
                     'Validation Error'}
                  </h3>
                  <div className={`mt-1 text-sm ${
                    loginError.type === 'network' || loginError.type === 'server'
                      ? 'text-yellow-700'
                      : loginError.type === 'account'
                      ? 'text-orange-700'
                      : 'text-red-700'
                  }`}>
                    {loginError.message}
                    {(loginError.type === 'authentication' || loginError.type === 'network' || loginError.type === 'server') && (
                      <div className="mt-2 space-x-2">
                        <button
                          type="button"
                          className="text-sm underline hover:no-underline focus:outline-none"
                          onClick={handleRetry}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Retrying...' : 'Try again'}
                        </button>
                        {loginError.type === 'authentication' && (
                          <>
                            {' • '}
                            <a href="#" className="text-sm underline hover:no-underline">
                              Forgot password?
                            </a>
                          </>
                        )}
                        {retryCount > 1 && (
                          <span className="text-xs block mt-1 opacity-75">
                            Attempt {retryCount}
                            {retryCount >= 3 && loginError.type === 'server' && ' - Consider trying again later'}
                          </span>
                        )}
                      </div>
                    )}
                    {loginError.type === 'account' && (
                      <div className="mt-2">
                        <a href="mailto:support@delivery-uae.com" className="text-sm underline hover:no-underline">
                          Contact Support
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-primary hover:text-primary/80"
              >
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign in to your business account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ErrorBoundary>
  );
}