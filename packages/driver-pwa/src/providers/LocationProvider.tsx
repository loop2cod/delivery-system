'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDriver } from './DriverProvider';

interface LocationContextType {
  currentLocation: { lat: number; lng: number } | null;
  isTracking: boolean;
  permission: 'granted' | 'denied' | 'prompt';
  accuracy: number | null;
  
  startTracking: () => void;
  stopTracking: () => void;
  requestPermission: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  
  const { updateLocation, isAuthenticated } = useDriver();

  // Check initial permission state
  useEffect(() => {
    if ('geolocation' in navigator && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermission(result.state as 'granted' | 'denied' | 'prompt');
        
        result.addEventListener('change', () => {
          setPermission(result.state as 'granted' | 'denied' | 'prompt');
        });
      });
    }
  }, []);

  // Request location permission
  const requestPermission = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      console.error('Geolocation is not supported');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      setPermission('granted');
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
      setAccuracy(position.coords.accuracy);
    } catch (error) {
      console.error('Location permission denied:', error);
      setPermission('denied');
    }
  }, []);

  // Start location tracking
  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator) || permission !== 'granted') {
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setCurrentLocation(newLocation);
        setAccuracy(position.coords.accuracy);
        
        // Update location on server if authenticated
        if (isAuthenticated) {
          updateLocation(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy
          );
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 30000 // 30 seconds
      }
    );

    setWatchId(id);
    setIsTracking(true);
  }, [permission, watchId, isAuthenticated, updateLocation]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  // Auto-start tracking when permission is granted and user is authenticated
  useEffect(() => {
    if (permission === 'granted' && isAuthenticated && !isTracking) {
      startTracking();
    }
  }, [permission, isAuthenticated, isTracking, startTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const value: LocationContextType = {
    currentLocation,
    isTracking,
    permission,
    accuracy,
    startTracking,
    stopTracking,
    requestPermission
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}