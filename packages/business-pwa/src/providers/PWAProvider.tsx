'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Workbox } from 'workbox-window';

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  installPWA: () => void;
  updateAvailable: boolean;
  updatePWA: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [wb, setWb] = useState<Workbox | null>(null);

  useEffect(() => {
    // Check if app is installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppChrome = 'standalone' in window.navigator && window.navigator.standalone;
      setIsInstalled(isStandalone || isInWebAppChrome);
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Initialize service worker
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      const workbox = new Workbox('/sw.js');

      workbox.addEventListener('installed', (event) => {
        if (event.isUpdate) {
          setUpdateAvailable(true);
        }
      });

      workbox.addEventListener('waiting', () => {
        setUpdateAvailable(true);
      });

      workbox.addEventListener('controlling', () => {
        window.location.reload();
      });

      workbox.register();
      setWb(workbox);
    }

    checkInstalled();
    setIsOnline(navigator.onLine);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  const updatePWA = () => {
    if (!wb) return;

    wb.addEventListener('controlling', () => {
      window.location.reload();
    });

    if (wb.waiting) {
      wb.messageSkipWaiting();
    }
  };

  const value: PWAContextType = {
    isInstallable,
    isInstalled,
    isOnline,
    installPWA,
    updateAvailable,
    updatePWA,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
}