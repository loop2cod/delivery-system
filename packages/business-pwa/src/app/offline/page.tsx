'use client';

import { useEffect, useState } from 'react';
import { 
  WifiIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-6">
          {isOnline ? (
            <WifiIcon className="h-16 w-16 text-green-500 mx-auto" />
          ) : (
            <ExclamationTriangleIcon className="h-16 w-16 text-orange-500 mx-auto" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {isOnline ? 'Connection Restored!' : 'You\'re Offline'}
        </h1>

        <p className="text-gray-600 mb-6">
          {isOnline 
            ? 'Your internet connection has been restored. Click retry to reload the page.'
            : 'It looks like you\'re not connected to the internet. Please check your connection and try again.'
          }
        </p>

        <div className="space-y-4">
          <button
            onClick={handleRetry}
            disabled={!isOnline}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>

          <div className="text-sm text-gray-500">
            <p>Status: <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span></p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">UAE</span>
            </div>
            <span>Business Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
}