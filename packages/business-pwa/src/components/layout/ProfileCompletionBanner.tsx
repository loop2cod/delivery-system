'use client';

import { useState } from 'react';
import Link from 'next/link';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useBusiness } from '@/providers/BusinessProvider';

export function ProfileCompletionBanner() {
  const { requiresProfileCompletion } = useBusiness();
  const [dismissed, setDismissed] = useState(false);

  if (!requiresProfileCompletion || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700">
            <span className="font-medium">Profile incomplete:</span> Please complete your company profile to start creating delivery requests.{' '}
            <Link
              href="/profile"
              className="font-medium underline text-yellow-700 hover:text-yellow-600"
            >
              Complete profile now
            </Link>
          </p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex rounded-md bg-yellow-50 p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}