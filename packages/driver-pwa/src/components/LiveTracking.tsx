'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LocationServicesManager, LocationCoordinate, GeofenceBoundary, locationUtils } from '@delivery-uae/shared/location-services';

interface LiveTrackingProps {
  deliveryId?: string;
  onLocationUpdate: (location: LocationCoordinate) => void;
  onGeofenceEvent: (event: { type: 'enter' | 'exit'; geofence: GeofenceBoundary; location: LocationCoordinate }) => void;
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

interface LiveTrackingSettings {
  updateInterval: number;
  highAccuracy: boolean;
  backgroundTracking: boolean;
  saveTrackingHistory: boolean;
  shareLocation: boolean;
}

export default function LiveTracking({
  deliveryId,
  onLocationUpdate,
  onGeofenceEvent,
  onError,
  className = ''
}: LiveTrackingProps) {
  const [locationManager] = useState(() => new LocationServicesManager({
    enableHighAccuracy: true,
    distanceFilter: 5,
    timeFilter: 5000,
    backgroundTracking: true
  }));

  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinate | null>(null);
  const [trackingStats, setTrackingStats] = useState<TrackingStats>({
    totalDistance: 0,
    totalTime: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    locationUpdates: 0
  });
  
  const [settings, setSettings] = useState<LiveTrackingSettings>({
    updateInterval: 5000,
    highAccuracy: true,
    backgroundTracking: true,
    saveTrackingHistory: true,
    shareLocation: true
  });

  const [geofences, setGeofences] = useState<GeofenceBoundary[]>([]);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  
  const startTimeRef = useRef<number | null>(null);
  const previousLocationRef = useRef<LocationCoordinate | null>(null);
  const trackingHistoryRef = useRef<LocationCoordinate[]>([]);
  const uploadQueueRef = useRef<LocationCoordinate[]>([]);

  useEffect(() => {
    // Initialize location services
    initializeTracking();
    
    // Monitor battery status
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level * 100);
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(battery.level * 100);
        });
      });
    }

    // Monitor connection status
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      stopTracking();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Update location manager configuration when settings change
    locationManager.updateConfig({
      enableHighAccuracy: settings.highAccuracy,
      timeFilter: settings.updateInterval,
      backgroundTracking: settings.backgroundTracking
    });
  }, [settings, locationManager]);

  const initializeTracking = () => {
    // Set up event listeners
    locationManager.on('locationUpdate', handleLocationUpdate);
    locationManager.on('locationError', handleLocationError);
    locationManager.on('geofenceEnter', handleGeofenceEnter);
    locationManager.on('trackingStarted', handleTrackingStarted);
    locationManager.on('trackingStopped', handleTrackingStopped);
  };

  const handleLocationUpdate = async (location: LocationCoordinate) => {
    setCurrentLocation(location);
    setLastUpdateTime(Date.now());
    
    // Update statistics
    updateTrackingStats(location);
    
    // Add to tracking history
    trackingHistoryRef.current.push(location);
    
    // Keep only last 1000 locations in memory
    if (trackingHistoryRef.current.length > 1000) {
      trackingHistoryRef.current = trackingHistoryRef.current.slice(-1000);
    }

    // Queue for upload to server
    if (settings.shareLocation) {
      uploadQueueRef.current.push(location);
      await uploadLocationUpdates();
    }
    
    // Callback to parent
    onLocationUpdate(location);
  };

  const handleLocationError = (error: GeolocationPositionError) => {
    console.error('[LiveTracking] Location error:', error);
    let errorMessage = 'Location tracking error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable. Check your GPS connection.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timeout. Please try again.';
        break;
    }
    
    onError(errorMessage);
  };

  const handleGeofenceEnter = (data: { geofence: GeofenceBoundary; location: LocationCoordinate }) => {
    console.log('[LiveTracking] Geofence entered:', data.geofence.id);
    onGeofenceEvent({ type: 'enter', geofence: data.geofence, location: data.location });
  };

  const handleTrackingStarted = () => {
    console.log('[LiveTracking] Tracking started');
    startTimeRef.current = Date.now();
  };

  const handleTrackingStopped = () => {
    console.log('[LiveTracking] Tracking stopped');
    startTimeRef.current = null;
  };

  const updateTrackingStats = (location: LocationCoordinate) => {
    setTrackingStats(prevStats => {
      const newStats = { ...prevStats };
      newStats.locationUpdates += 1;

      if (previousLocationRef.current) {
        // Calculate distance traveled
        const distance = locationManager.calculateDistance(previousLocationRef.current, location);
        newStats.totalDistance += distance;

        // Calculate speed (if available from GPS)
        if (location.speed !== undefined) {
          newStats.maxSpeed = Math.max(newStats.maxSpeed, location.speed * 3.6); // Convert m/s to km/h
        }

        // Calculate average speed
        if (startTimeRef.current) {
          const timeElapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
          newStats.totalTime = timeElapsed;
          newStats.averageSpeed = newStats.totalDistance > 0 ? (newStats.totalDistance / 1000) / (timeElapsed / 3600) : 0;
        }
      }

      previousLocationRef.current = location;
      return newStats;
    });
  };

  const uploadLocationUpdates = async () => {
    if (!deliveryId || uploadQueueRef.current.length === 0 || connectionStatus === 'offline') {
      return;
    }

    try {
      const locationsToUpload = [...uploadQueueRef.current];
      uploadQueueRef.current = [];

      const response = await fetch('/api/driver/location/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`
        },
        body: JSON.stringify({
          deliveryId,
          locations: locationsToUpload,
          metadata: {
            trackingStats,
            batteryLevel,
            timestamp: Date.now()
          }
        })
      });

      if (!response.ok) {
        // Re-queue failed uploads
        uploadQueueRef.current.push(...locationsToUpload);
        throw new Error('Failed to upload location updates');
      }

      console.log(`[LiveTracking] Uploaded ${locationsToUpload.length} location updates`);
    } catch (error) {
      console.error('[LiveTracking] Upload failed:', error);
    }
  };

  const startTracking = async () => {
    try {
      await locationManager.startTracking();
      setIsTracking(true);
    } catch (error) {
      console.error('[LiveTracking] Failed to start tracking:', error);
      onError(error instanceof Error ? error.message : 'Failed to start tracking');
    }
  };

  const stopTracking = () => {
    locationManager.stopTracking();
    setIsTracking(false);
    
    // Reset stats
    setTrackingStats({
      totalDistance: 0,
      totalTime: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      locationUpdates: 0
    });
    
    previousLocationRef.current = null;
    trackingHistoryRef.current = [];
  };

  const addDeliveryGeofence = (delivery: any, radius: number = 50) => {
    const geofence: GeofenceBoundary = {
      id: `delivery_${delivery.id}`,
      center: {
        latitude: delivery.delivery_latitude,
        longitude: delivery.delivery_longitude,
        timestamp: Date.now()
      },
      radius,
      type: 'delivery',
      metadata: {
        deliveryId: delivery.id,
        customerName: delivery.customer_name,
        address: delivery.delivery_address
      }
    };

    locationManager.addGeofence(geofence);
    setGeofences(prev => [...prev, geofence]);
  };

  const removeGeofence = (geofenceId: string) => {
    locationManager.removeGeofence(geofenceId);
    setGeofences(prev => prev.filter(g => g.id !== geofenceId));
  };

  const exportTrackingData = () => {
    const trackingData = {
      deliveryId,
      locations: trackingHistoryRef.current,
      stats: trackingStats,
      geofences,
      settings,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(trackingData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tracking_data_${deliveryId || 'session'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getAccuracyColor = (accuracy?: number): string => {
    if (!accuracy) return 'text-gray-500';
    if (accuracy < 5) return 'text-green-600';
    if (accuracy < 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConnectionStatusColor = (): string => {
    return connectionStatus === 'online' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Live Tracking</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isTracking ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Control Buttons */}
        <div className="flex gap-3">
          {!isTracking ? (
            <button
              onClick={startTracking}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              <span className="mr-2">▶️</span>
              Start Tracking
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              <span className="mr-2">⏹️</span>
              Stop Tracking
            </button>
          )}
          
          <button
            onClick={exportTrackingData}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            title="Export tracking data"
          >
            📁
          </button>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#142C4F]">
              {connectionStatus === 'online' ? '🟢' : '🔴'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Connection</div>
            <div className={`text-xs font-medium ${getConnectionStatusColor()}`}>
              {connectionStatus}
            </div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#142C4F]">
              {currentLocation?.accuracy ? Math.round(currentLocation.accuracy) : '--'}m
            </div>
            <div className="text-xs text-gray-500 mt-1">Accuracy</div>
            <div className={`text-xs font-medium ${getAccuracyColor(currentLocation?.accuracy)}`}>
              {currentLocation?.accuracy ? (currentLocation.accuracy < 10 ? 'High' : 'Low') : 'Unknown'}
            </div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#142C4F]">
              {batteryLevel ? `${Math.round(batteryLevel)}%` : '--'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Battery</div>
            <div className={`text-xs font-medium ${
              batteryLevel && batteryLevel > 50 ? 'text-green-600' :
              batteryLevel && batteryLevel > 20 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {batteryLevel ? (batteryLevel > 20 ? 'Good' : 'Low') : 'Unknown'}
            </div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-[#142C4F]">
              {trackingStats.locationUpdates}
            </div>
            <div className="text-xs text-gray-500 mt-1">Updates</div>
            <div className="text-xs font-medium text-gray-600">
              {lastUpdateTime ? `${Math.round((Date.now() - lastUpdateTime) / 1000)}s ago` : 'Never'}
            </div>
          </div>
        </div>

        {/* Tracking Statistics */}
        {isTracking && trackingStats.locationUpdates > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-[#142C4F]">
                {locationUtils.formatDistance(trackingStats.totalDistance)}
              </div>
              <div className="text-xs text-gray-500">Distance</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-[#142C4F]">
                {locationUtils.formatDuration(trackingStats.totalTime)}
              </div>
              <div className="text-xs text-gray-500">Time</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-[#142C4F]">
                {trackingStats.averageSpeed > 0 ? `${trackingStats.averageSpeed.toFixed(1)} km/h` : '--'}
              </div>
              <div className="text-xs text-gray-500">Avg Speed</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-[#142C4F]">
                {trackingStats.maxSpeed > 0 ? `${trackingStats.maxSpeed.toFixed(1)} km/h` : '--'}
              </div>
              <div className="text-xs text-gray-500">Max Speed</div>
            </div>
          </div>
        )}

        {/* Current Location */}
        {currentLocation && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Location</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Coordinates:</span>
                  <span className="ml-2 font-mono">{locationUtils.formatCoordinates(currentLocation)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Timestamp:</span>
                  <span className="ml-2">{new Date(currentLocation.timestamp).toLocaleTimeString()}</span>
                </div>
                {currentLocation.altitude !== undefined && (
                  <div>
                    <span className="text-gray-500">Altitude:</span>
                    <span className="ml-2">{Math.round(currentLocation.altitude)}m</span>
                  </div>
                )}
                {currentLocation.heading !== undefined && (
                  <div>
                    <span className="text-gray-500">Heading:</span>
                    <span className="ml-2">{Math.round(currentLocation.heading)}°</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Geofences */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Active Geofences</h3>
            <span className="text-xs text-gray-500">{geofences.length} active</span>
          </div>
          
          {geofences.length > 0 ? (
            <div className="space-y-2">
              {geofences.map((geofence) => (
                <div key={geofence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{geofence.metadata?.customerName || geofence.id}</div>
                    <div className="text-xs text-gray-500">
                      {geofence.type} • {geofence.radius}m radius
                    </div>
                  </div>
                  <button
                    onClick={() => removeGeofence(geofence.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              No active geofences
            </div>
          )}
        </div>

        {/* Settings */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Tracking Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">High Accuracy GPS</span>
              <input
                type="checkbox"
                checked={settings.highAccuracy}
                onChange={(e) => setSettings(prev => ({ ...prev, highAccuracy: e.target.checked }))}
                className="rounded border-gray-300 text-[#C32C3C] focus:ring-[#C32C3C]"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Background Tracking</span>
              <input
                type="checkbox"
                checked={settings.backgroundTracking}
                onChange={(e) => setSettings(prev => ({ ...prev, backgroundTracking: e.target.checked }))}
                className="rounded border-gray-300 text-[#C32C3C] focus:ring-[#C32C3C]"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Share Location</span>
              <input
                type="checkbox"
                checked={settings.shareLocation}
                onChange={(e) => setSettings(prev => ({ ...prev, shareLocation: e.target.checked }))}
                className="rounded border-gray-300 text-[#C32C3C] focus:ring-[#C32C3C]"
              />
            </label>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Update Interval: {settings.updateInterval / 1000}s
              </label>
              <input
                type="range"
                min="1000"
                max="30000"
                step="1000"
                value={settings.updateInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, updateInterval: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}