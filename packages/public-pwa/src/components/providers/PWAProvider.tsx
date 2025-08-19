'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  install: () => Promise<void>;
  dismissInstallPrompt: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAProviderProps {
  children: ReactNode;
}

// PWA disabled for public site. Provider is kept for potential future use but does nothing.
export function PWAProvider({ children }: PWAProviderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSStandalone = isIOS && (window.navigator as any).standalone;
      
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    // Set up online/offline detection
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Set up install prompt event listener
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      e.preventDefault();
      setDeferredPrompt(event);
      
      // Show install prompt after a delay (only if not already dismissed)
      const installPromptDismissed = localStorage.getItem('pwa-install-dismissed');
      if (!installPromptDismissed && !isInstalled) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 10000); // Show after 10 seconds
      }
    };

    // Track PWA installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      
      // Track installation
      fetch('/api/public/pwa-install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pwaType: 'public',
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          installSource: 'prompt'
        }),
      }).catch(console.error);
    };

    // Skip service worker registration for non-PWA public site

    // Initialize
    checkInstalled();
    updateOnlineStatus();

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [isInstalled]);

  const install = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const contextValue: PWAContextType = {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isOnline,
    install,
    dismissInstallPrompt,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* PWA Install Prompt */}
      {showInstallPrompt && !isInstalled && (
        <PWAInstallPrompt
          onInstall={install}
          onDismiss={dismissInstallPrompt}
        />
      )}
      
      {/* Offline Indicator */}
      <OfflineIndicator isOnline={isOnline} />
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}