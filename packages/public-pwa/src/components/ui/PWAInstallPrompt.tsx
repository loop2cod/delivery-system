'use client';

import { useState } from 'react';
import { XMarkIcon, DevicePhoneMobileIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

interface PWAInstallPromptProps {
  onInstall: () => Promise<void>;
  onDismiss: () => void;
}

export function PWAInstallPrompt({ onInstall, onDismiss }: PWAInstallPromptProps) {
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await onInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  const benefits = [
    'Instant package tracking',
    'Quick inquiry forms', 
    'Offline access',
    'Fast loading',
    'Native app experience'
  ];

  return (
    <div className="pwa-install-prompt animate-slide-up">
      <div className="glass-card border-2 border-accent/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold gradient-text">
                Install UAE Delivery App
              </h3>
              <p className="text-sm text-muted-foreground">
                Track packages and make inquiries right from your home screen
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Dismiss install prompt"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center space-x-2 text-sm">
                <CheckIcon className="w-4 h-4 text-success flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="btn-accent flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInstalling ? (
              <>
                <div className="loading-spinner w-4 h-4" />
                <span>Installing...</span>
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Install App</span>
              </>
            )}
          </button>
          <button
            onClick={onDismiss}
            className="btn-outline px-4"
          >
            Maybe Later
          </button>
        </div>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          <p>Free installation • Works offline • No app store required</p>
        </div>
      </div>
    </div>
  );
}