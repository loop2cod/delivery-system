'use client';

import React, { useState, useEffect } from 'react';
import { LocationCoordinate, locationUtils } from '@/lib/location-services';

interface LiveTrackingProps {
  deliveryId?: string;
  onLocationUpdate: (location: LocationCoordinate) => void;
  onGeofenceEvent: (event: { type: 'enter' | 'exit'; geofence: any; location: LocationCoordinate }) => void;
  onError: (error: string) => void;
  className?: string;
}

interface TrackingStats {
  totalDistance: number;
  totalTime: number;
  averageSpeed: number;
  maxSpeed: number;
  locationUpdates: number;
}

export default function LiveTracking({
  deliveryId,
  onLocationUpdate,
  onGeofenceEvent,
  onError,
  className = ''
}: LiveTrackingProps) {
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinate | null>(null);
  const [trackingStats, setTrackingStats] = useState<TrackingStats>({
    totalDistance: 0,
    totalTime: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    locationUpdates: 0
  });
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [settings] = useState({
    highAccuracy: true,
    updateInterval: 5000,
    backgroundTracking: true
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) {
      onError('Geolocation is not supported by this browser');
      return;
    }

    const options = {
      enableHighAccuracy: settings.highAccuracy,
      timeout: 10000,
      maximumAge: settings.updateInterval
    };

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationCoordinate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: position.timestamp
        };

        setCurrentLocation(location);
        setLastUpdateTime(Date.now());
        onLocationUpdate(location);
        
        // Update stats
        setTrackingStats(prev => ({
          ...prev,
          locationUpdates: prev.locationUpdates + 1,
          maxSpeed: Math.max(prev.maxSpeed, location.speed || 0)
        }));
      },
      (error) => {
        let errorMessage = 'Unknown location error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        onError(errorMessage);
      },
      options
    );

    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const resetStats = () => {
    setTrackingStats({
      totalDistance: 0,
      totalTime: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      locationUpdates: 0
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Live Tracking</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        {/* Tracking Controls */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={toggleTracking}
            className={`px-4 py-2 rounded-lg font-medium ${
              isTracking
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
          
          <button
            onClick={resetStats}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Reset Stats
          </button>
        </div>

        {/* Current Location */}
        {currentLocation && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Current Location</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Coordinates:</span>
                <span className="font-mono">{locationUtils.formatCoordinates(currentLocation)}</span>
              </div>
              {currentLocation.accuracy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className={`font-medium ${
                    currentLocation.accuracy < 10 ? 'text-green-600' : 
                    currentLocation.accuracy < 20 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    ±{Math.round(currentLocation.accuracy)}m
                  </span>
                </div>
              )}
              {currentLocation.speed !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Speed:</span>
                  <span className="font-medium">{Math.round(currentLocation.speed * 3.6)} km/h</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Last Update:</span>
                <span className="font-medium">
                  {Math.round((Date.now() - lastUpdateTime) / 1000)}s ago
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-600">{trackingStats.locationUpdates}</div>
            <div className="text-xs text-blue-600">Updates</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-600">
              {Math.round(trackingStats.maxSpeed * 3.6)} km/h
            </div>
            <div className="text-xs text-green-600">Max Speed</div>
          </div>
        </div>

        {/* Status Messages */}
        {!isTracking && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              📍 Tracking is stopped. Click "Start Tracking" to begin location monitoring.
            </p>
          </div>
        )}

        {isTracking && !currentLocation && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              🔍 Searching for GPS signal...
            </p>
          </div>
        )}

        {deliveryId && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700">
              📦 Tracking for delivery: <span className="font-mono">{deliveryId}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}