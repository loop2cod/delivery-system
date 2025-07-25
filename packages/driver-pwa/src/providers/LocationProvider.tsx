'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export interface LocationContextType {
  currentLocation: Location | null;
  isTracking: boolean;
  error: string | null;
  permission: 'granted' | 'denied' | 'prompt' | 'unsupported';
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  requestPermission: () => Promise<boolean>;
  getCurrentPosition: () => Promise<Location | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');
  const [watchId, setWatchId] = useState<number | null>(null);

  // Check if geolocation is supported and get initial permission state
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermission('unsupported');
      setError('Geolocation is not supported by this browser');
      return;
    }

    // Check existing permission
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermission(result.state as any);
        
        result.addEventListener('change', () => {
          setPermission(result.state as any);
        });
      }).catch(() => {
        // Fallback to prompt if permissions API is not available
        setPermission('prompt');
      });
    }

    // Load last known location from localStorage
    const savedLocation = localStorage.getItem('driver_last_location');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setCurrentLocation(location);
      } catch (error) {
        console.error('Failed to parse saved location:', error);
      }
    }
  }, []);

  // Save location to localStorage whenever it changes
  useEffect(() => {
    if (currentLocation) {
      localStorage.setItem('driver_last_location', JSON.stringify(currentLocation));
    }
  }, [currentLocation]);

  const requestPermission = async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return false;
    }

    try {
      // Try to get current position to trigger permission request
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      setPermission('granted');
      setError(null);
      
      const location: Location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
      
      setCurrentLocation(location);
      return true;
    } catch (error: any) {
      console.error('Permission request failed:', error);
      
      if (error.code === error.PERMISSION_DENIED) {
        setPermission('denied');
        setError('Location permission denied. Please enable location access in your browser settings.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setError('Location information is unavailable. Please check your GPS settings.');
      } else if (error.code === error.TIMEOUT) {
        setError('Location request timed out. Please try again.');
      } else {
        setError('An error occurred while requesting location permission.');
      }
      
      return false;
    }
  };

  const getCurrentPosition = async (): Promise<Location | null> => {
    if (!navigator.geolocation || permission !== 'granted') {
      return null;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        });
      });

      const location: Location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      setCurrentLocation(location);
      setError(null);
      return location;
    } catch (error: any) {
      console.error('Failed to get current position:', error);
      setError('Failed to get current location');
      return null;
    }
  };

  const startTracking = async (): Promise<void> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if (isTracking) return;

    try {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          
          setCurrentLocation(location);
          setError(null);
        },
        (error) => {
          console.error('Location tracking error:', error);
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setError('Location permission denied');
              setPermission('denied');
              break;
            case error.POSITION_UNAVAILABLE:
              setError('Location information is unavailable');
              break;
            case error.TIMEOUT:
              setError('Location request timed out');
              break;
            default:
              setError('An unknown error occurred while tracking location');
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        }
      );

      setWatchId(id);
      setIsTracking(true);
      setError(null);
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      setError('Failed to start location tracking');
    }
  };

  const stopTracking = (): void => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  // Clean up on unmount
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
    error,
    permission,
    startTracking,
    stopTracking,
    requestPermission,
    getCurrentPosition,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}