'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDriver } from './DriverProvider';

interface LocationContextType {
  currentLocation: { lat: number; lng: number } | null;
  isTracking: boolean;
  permission: PermissionState | null;
  accuracy: number | null;
  lastUpdate: Date | null;
  
  // Methods
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  requestPermission: () => Promise<PermissionState>;
  getCurrentPosition: () => Promise<{ lat: number; lng: number } | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { updateLocation } = useDriver();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Check initial permission status
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermission(result.state);
        
        result.addEventListener('change', () => {
          setPermission(result.state);
          if (result.state === 'denied' && isTracking) {
            stopTracking();
          }
        });
      });
    }
  }, [isTracking]);

  // Request geolocation permission
  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation is not supported');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermission('granted');
          resolve('granted');
        },
        (error) => {
          console.error('Geolocation permission denied:', error);
          setPermission('denied');
          resolve('denied');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  // Get current position once
  const getCurrentPosition = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation is not supported');
    }

    if (permission !== 'granted') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        return null;
      }
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          setAccuracy(position.coords.accuracy);
          setLastUpdate(new Date());
          resolve(location);
        },
        (error) => {
          console.error('Error getting current position:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, [permission, requestPermission]);

  // Start continuous tracking
  const startTracking = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation is not supported');
    }

    if (permission !== 'granted') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        throw new Error('Geolocation permission denied');
      }
    }

    if (isTracking) {
      return; // Already tracking
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000 // 30 seconds
    };

    const successCallback = (position: GeolocationPosition) => {
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setCurrentLocation(location);
      setAccuracy(position.coords.accuracy);
      setLastUpdate(new Date());

      // Update driver location on server
      updateLocation(
        position.coords.latitude,
        position.coords.longitude,
        position.coords.accuracy
      );
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', error);
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setPermission('denied');
          stopTracking();
          break;
        case error.POSITION_UNAVAILABLE:
          console.warn('Position unavailable');
          break;
        case error.TIMEOUT:
          console.warn('Geolocation timeout');
          break;
      }
    };

    const id = navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      options
    );

    setWatchId(id);
    setIsTracking(true);

    // Also get initial position immediately
    navigator.geolocation.getCurrentPosition(
      successCallback,
      errorCallback,
      options
    );
  }, [permission, requestPermission, updateLocation, isTracking]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  // Auto-start tracking when permission is granted and driver is authenticated
  useEffect(() => {
    if (permission === 'granted' && !isTracking) {
      // Auto-start tracking after a short delay
      const timer = setTimeout(() => {
        startTracking().catch(console.error);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [permission, isTracking, startTracking]);

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
    lastUpdate,
    startTracking,
    stopTracking,
    requestPermission,
    getCurrentPosition
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