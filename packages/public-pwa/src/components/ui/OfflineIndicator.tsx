'use client';

import { WifiIcon as WifiOffIcon } from '@heroicons/react/24/outline';
import { WifiIcon } from '@heroicons/react/24/solid';

interface OfflineIndicatorProps {
  isOnline: boolean;
}

export function OfflineIndicator({ isOnline }: OfflineIndicatorProps) {
  return (
    <div className={`offline-indicator ${isOnline ? 'hidden' : 'visible'}`}>
      <div className="flex items-center justify-center space-x-2">
        <WifiOffIcon className="w-4 h-4" />
        <span>Working offline - Changes will sync when connected</span>
      </div>
    </div>
  );
}