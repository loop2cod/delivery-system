'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RouteOptimizer from '@/components/RouteOptimizer';
import LiveTracking from '@/components/LiveTracking';
import { LocationCoordinate, OptimizedRoute, GeofenceBoundary, locationUtils } from '@/lib/location-services';

interface TrackingPageState {
  activeTab: 'tracking' | 'optimization' | 'analytics';
  deliveries: any[];
  currentRoute: OptimizedRoute | null;
  trackingActive: boolean;
}

export default function TrackingPage() {
  const router = useRouter();
  const [state, setState] = useState<TrackingPageState>({
    activeTab: 'tracking',
    deliveries: [],
    currentRoute: null,
    trackingActive: false
  });

  const [currentLocation, setCurrentLocation] = useState<LocationCoordinate | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationCoordinate[]>([]);
  const [routeProgress, setRouteProgress] = useState({
    completedWaypoints: 0,
    totalWaypoints: 0,
    remainingDistance: 0,
    estimatedTimeRemaining: 0
  });
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
    timestamp: number;
  }>>([]);

  useEffect(() => {
    loadDriverDeliveries();
  }, []);

  const loadDriverDeliveries = async () => {
    try {
      const response = await fetch('/api/driver/deliveries', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, deliveries: data.deliveries || [] }));
      }
    } catch (error) {
      console.error('Failed to load deliveries:', error);
      addNotification('error', 'Load Error', 'Failed to load deliveries');
    }
  };

  const handleLocationUpdate = async (location: LocationCoordinate) => {
    setCurrentLocation(location);
    setLocationHistory(prev => [...prev.slice(-50), location]); // Keep last 50 locations

    // Update route progress if we have an active route
    if (state.currentRoute) {
      updateRouteProgress(location);
    }

    // Send location to server
    try {
      await fetch('/api/driver/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          heading: location.heading,
          speed: location.speed,
          timestamp: location.timestamp,
          metadata: {
            routeId: state.currentRoute?.id,
            batteryLevel: await getBatteryLevel()
          }
        })
      });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const handleRouteOptimized = (route: OptimizedRoute) => {
    setState(prev => ({ ...prev, currentRoute: route }));
    setRouteProgress({
      completedWaypoints: 0,
      totalWaypoints: route.waypoints.length,
      remainingDistance: route.totalDistance,
      estimatedTimeRemaining: route.totalDuration
    });
    
    addNotification('success', 'Route Optimized', 
      `New route with ${route.waypoints.length} stops, ${locationUtils.formatDistance(route.totalDistance)} total distance`);
  };

  const handleGeofenceEvent = (event: { type: 'enter' | 'exit'; geofence: GeofenceBoundary; location: LocationCoordinate }) => {
    const { type, geofence } = event;
    
    if (type === 'enter') {
      if (geofence.type === 'delivery') {
        addNotification('info', 'Delivery Location Reached', 
          `You've arrived at ${geofence.metadata?.customerName || 'delivery location'}`);
        
        // Update route progress
        if (state.currentRoute) {
          const waypointIndex = state.currentRoute.waypoints.findIndex(w => w.deliveryId === geofence.metadata?.deliveryId);
          if (waypointIndex >= 0) {
            setRouteProgress(prev => ({
              ...prev,
              completedWaypoints: Math.max(prev.completedWaypoints, waypointIndex + 1)
            }));
          }
        }
      }
    }
  };

  const updateRouteProgress = (currentLocation: LocationCoordinate) => {
    if (!state.currentRoute) return;

    const { waypoints } = state.currentRoute;
    let nearestWaypointIndex = 0;
    let nearestDistance = Infinity;

    // Find nearest waypoint
    waypoints.forEach((waypoint, index) => {
      const distance = calculateDistance(currentLocation, waypoint.coordinate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestWaypointIndex = index;
      }
    });

    // Calculate remaining distance and time
    let remainingDistance = 0;
    let remainingTime = 0;

    for (let i = nearestWaypointIndex; i < waypoints.length; i++) {
      const waypoint = waypoints[i];
      if (i === nearestWaypointIndex) {
        remainingDistance += calculateDistance(currentLocation, waypoint.coordinate);
      } else {
        const prevWaypoint = waypoints[i - 1];
        remainingDistance += calculateDistance(prevWaypoint.coordinate, waypoint.coordinate);
      }
      remainingTime += waypoint.estimatedDuration || 600;
    }

    setRouteProgress(prev => ({
      ...prev,
      remainingDistance,
      estimatedTimeRemaining: remainingTime
    }));
  };

  const calculateDistance = (coord1: LocationCoordinate, coord2: LocationCoordinate): number => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const getBatteryLevel = async (): Promise<number | null> => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return battery.level * 100;
      } catch (error) {
        return null;
      }
    }
    return null;
  };

  const addNotification = (type: 'info' | 'warning' | 'success' | 'error', title: string, message: string) => {
    const notification = {
      id: `notif_${Date.now()}`,
      type,
      title,
      message,
      timestamp: Date.now()
    };

    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5 notifications
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const handleTrackingError = (error: string) => {
    addNotification('error', 'Tracking Error', error);
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const startActiveRoute = async () => {
    if (!state.currentRoute) return;

    try {
      const response = await fetch('/api/driver/route/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`
        },
        body: JSON.stringify({
          routeId: state.currentRoute.id,
          startLocation: currentLocation
        })
      });

      if (response.ok) {
        setState(prev => ({ ...prev, trackingActive: true }));
        addNotification('success', 'Route Started', 'Active route tracking started');
      }
    } catch (error) {
      console.error('Failed to start route:', error);
      addNotification('error', 'Route Error', 'Failed to start active route');
    }
  };

  const getNotificationIcon = (type: string): string => {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      success: '✅',
      error: '❌'
    };
    return icons[type as keyof typeof icons] || 'ℹ️';
  };

  const getNotificationColor = (type: string): string => {
    const colors = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800'
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#142C4F] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">GPS Tracking & Routes</h1>
              <p className="mt-2 text-blue-100">Real-time location tracking and route optimization</p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{state.deliveries.length}</div>
                <div className="text-blue-200">Deliveries</div>
              </div>
              {state.currentRoute && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{routeProgress.completedWaypoints}</div>
                    <div className="text-blue-200">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {locationUtils.formatDistance(routeProgress.remainingDistance)}
                    </div>
                    <div className="text-blue-200">Remaining</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border flex items-center justify-between ${getNotificationColor(notification.type)}`}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-2">{getNotificationIcon(notification.type)}</span>
                  <div>
                    <div className="font-medium">{notification.title}</div>
                    <div className="text-sm opacity-90">{notification.message}</div>
                  </div>
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="text-sm opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'tracking', label: 'Live Tracking', icon: '📍' },
              { id: 'optimization', label: 'Route Optimization', icon: '🗺️' },
              { id: 'analytics', label: 'Analytics', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setState(prev => ({ ...prev, activeTab: tab.id as any }))}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  state.activeTab === tab.id
                    ? 'border-[#C32C3C] text-[#C32C3C]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Live Tracking Tab */}
          {state.activeTab === 'tracking' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Tracking Component */}
              <div className="lg:col-span-2">
                <LiveTracking
                  onLocationUpdate={handleLocationUpdate}
                  onGeofenceEvent={handleGeofenceEvent}
                  onError={handleTrackingError}
                />
              </div>

              {/* Route Progress */}
              <div className="space-y-6">
                {/* Current Route Status */}
                {state.currentRoute && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Active Route</h3>
                      {!state.trackingActive && (
                        <button
                          onClick={startActiveRoute}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Start Route
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress:</span>
                        <span className="font-medium">
                          {routeProgress.completedWaypoints} / {routeProgress.totalWaypoints} stops
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-[#C32C3C] h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(routeProgress.completedWaypoints / routeProgress.totalWaypoints) * 100}%` 
                          }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-[#142C4F]">
                            {locationUtils.formatDistance(routeProgress.remainingDistance)}
                          </div>
                          <div className="text-xs text-gray-500">Remaining Distance</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-semibold text-[#142C4F]">
                            {locationUtils.formatDuration(routeProgress.estimatedTimeRemaining)}
                          </div>
                          <div className="text-xs text-gray-500">Est. Time</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Location */}
                {currentLocation && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Position</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Coordinates:</span>
                        <span className="font-mono text-xs">
                          {locationUtils.formatCoordinates(currentLocation)}
                        </span>
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
                          <span className="font-medium">
                            {Math.round(currentLocation.speed * 3.6)} km/h
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Update:</span>
                        <span className="font-medium">
                          {new Date(currentLocation.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push('/navigation')}
                      className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🧭</span>
                        <div>
                          <div className="font-medium">Open Navigation</div>
                          <div className="text-xs text-gray-500">Turn-by-turn directions</div>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => router.push('/deliveries')}
                      className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📦</span>
                        <div>
                          <div className="font-medium">View Deliveries</div>
                          <div className="text-xs text-gray-500">Manage assigned deliveries</div>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => router.push('/scanner')}
                      className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📱</span>
                        <div>
                          <div className="font-medium">QR Scanner</div>
                          <div className="text-xs text-gray-500">Scan package QR codes</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Route Optimization Tab */}
          {state.activeTab === 'optimization' && (
            <RouteOptimizer
              deliveries={state.deliveries}
              onRouteOptimized={handleRouteOptimized}
              onError={handleTrackingError}
            />
          )}

          {/* Analytics Tab */}
          {state.activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Today's Stats */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Distance Traveled:</span>
                    <span className="font-medium">
                      {locationHistory.length > 1 ? 
                        locationUtils.formatDistance(
                          locationHistory.reduce((total, location, index) => {
                            if (index === 0) return 0;
                            return total + calculateDistance(locationHistory[index - 1], location);
                          }, 0)
                        ) : '0km'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Time:</span>
                    <span className="font-medium">
                      {state.trackingActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location Updates:</span>
                    <span className="font-medium">{locationHistory.length}</span>
                  </div>
                </div>
              </div>

              {/* Route Efficiency */}
              {state.currentRoute && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Efficiency</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Optimization Score:</span>
                      <span className="font-medium">{state.currentRoute.optimizationScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vehicle Type:</span>
                      <span className="font-medium capitalize">{state.currentRoute.vehicleType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Waypoints:</span>
                      <span className="font-medium">{state.currentRoute.waypoints.length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Accuracy */}
              {currentLocation && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">GPS Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accuracy:</span>
                      <span className={`font-medium ${
                        currentLocation.accuracy && currentLocation.accuracy < 10 ? 'text-green-600' : 
                        currentLocation.accuracy && currentLocation.accuracy < 20 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {currentLocation.accuracy ? `±${Math.round(currentLocation.accuracy)}m` : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Update:</span>
                      <span className="font-medium">
                        {Math.round((Date.now() - currentLocation.timestamp) / 1000)}s ago
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Altitude:</span>
                      <span className="font-medium">
                        {currentLocation.altitude ? `${Math.round(currentLocation.altitude)}m` : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}