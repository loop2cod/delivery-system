'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LocationServicesManager, OptimizedRoute, RouteWaypoint, locationUtils } from '@delivery-uae/shared/location-services';

interface RouteOptimizerProps {
  deliveries: any[];
  onRouteOptimized: (route: OptimizedRoute) => void;
  onError: (error: string) => void;
  className?: string;
}

interface OptimizationSettings {
  vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'walking';
  prioritizeTime: boolean;
  prioritizeDistance: boolean;
  avoidTolls: boolean;
  maxStopsPerRoute: number;
}

export default function RouteOptimizer({
  deliveries,
  onRouteOptimized,
  onError,
  className = ''
}: RouteOptimizerProps) {
  const [locationManager] = useState(() => new LocationServicesManager({
    enableHighAccuracy: true,
    distanceFilter: 10,
    timeFilter: 10000
  }));
  
  const [optimizing, setOptimizing] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<OptimizedRoute | null>(null);
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);
  const [settings, setSettings] = useState<OptimizationSettings>({
    vehicleType: 'car',
    prioritizeTime: true,
    prioritizeDistance: false,
    avoidTolls: false,
    maxStopsPerRoute: 10
  });
  const [routeAlternatives, setRouteAlternatives] = useState<OptimizedRoute[]>([]);

  useEffect(() => {
    // Auto-select all pending/assigned deliveries
    const autoSelect = deliveries
      .filter(d => ['pending', 'assigned', 'confirmed'].includes(d.status))
      .map(d => d.id);
    setSelectedDeliveries(autoSelect);
  }, [deliveries]);

  const handleOptimizeRoute = useCallback(async () => {
    if (selectedDeliveries.length === 0) {
      onError('Please select at least one delivery to optimize');
      return;
    }

    setOptimizing(true);
    
    try {
      // Get current location
      const currentPosition = await locationManager.getCurrentPosition();
      const startLocation = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        timestamp: Date.now()
      };

      // Convert selected deliveries to waypoints
      const waypoints: RouteWaypoint[] = deliveries
        .filter(d => selectedDeliveries.includes(d.id))
        .map(delivery => ({
          coordinate: {
            latitude: delivery.delivery_latitude,
            longitude: delivery.delivery_longitude,
            timestamp: Date.now()
          },
          address: delivery.delivery_address,
          description: `${delivery.service_type} - ${delivery.customer_name}`,
          deliveryId: delivery.id,
          estimatedDuration: getEstimatedDuration(delivery.service_type)
        }));

      // Generate multiple route alternatives
      const alternatives = await generateRouteAlternatives(waypoints, startLocation);
      setRouteAlternatives(alternatives);

      // Select best route
      const bestRoute = selectBestRoute(alternatives);
      setCurrentRoute(bestRoute);
      onRouteOptimized(bestRoute);

    } catch (error) {
      console.error('[RouteOptimizer] Optimization failed:', error);
      onError(error instanceof Error ? error.message : 'Route optimization failed');
    } finally {
      setOptimizing(false);
    }
  }, [selectedDeliveries, deliveries, locationManager, settings, onRouteOptimized, onError]);

  const generateRouteAlternatives = async (waypoints: RouteWaypoint[], startLocation: any): Promise<OptimizedRoute[]> => {
    const alternatives: OptimizedRoute[] = [];

    // Original order route
    const originalRoute = await locationManager.optimizeRoute(waypoints, startLocation);
    originalRoute.id = `${originalRoute.id}_original`;
    alternatives.push(originalRoute);

    // Time-optimized route (if different from original)
    if (settings.prioritizeTime) {
      const timeOptimized = await optimizeForTime(waypoints, startLocation);
      alternatives.push(timeOptimized);
    }

    // Distance-optimized route
    if (settings.prioritizeDistance) {
      const distanceOptimized = await optimizeForDistance(waypoints, startLocation);
      alternatives.push(distanceOptimized);
    }

    // Priority-based route (urgent deliveries first)
    const priorityOptimized = await optimizeByPriority(waypoints, startLocation);
    alternatives.push(priorityOptimized);

    return alternatives;
  };

  const optimizeForTime = async (waypoints: RouteWaypoint[], startLocation: any): Promise<OptimizedRoute> => {
    // Sort waypoints by estimated travel time from current location
    const timeOptimizedWaypoints = [...waypoints].sort((a, b) => {
      const timeA = locationManager.estimateTravelTime(startLocation, a.coordinate, settings.vehicleType);
      const timeB = locationManager.estimateTravelTime(startLocation, b.coordinate, settings.vehicleType);
      return timeA - timeB;
    });

    const route = await locationManager.optimizeRoute(timeOptimizedWaypoints, startLocation);
    route.id = `${route.id}_time`;
    return route;
  };

  const optimizeForDistance = async (waypoints: RouteWaypoint[], startLocation: any): Promise<OptimizedRoute> => {
    // Sort waypoints by distance from current location
    const distanceOptimizedWaypoints = [...waypoints].sort((a, b) => {
      const distA = locationManager.calculateDistance(startLocation, a.coordinate);
      const distB = locationManager.calculateDistance(startLocation, b.coordinate);
      return distA - distB;
    });

    const route = await locationManager.optimizeRoute(distanceOptimizedWaypoints, startLocation);
    route.id = `${route.id}_distance`;
    return route;
  };

  const optimizeByPriority = async (waypoints: RouteWaypoint[], startLocation: any): Promise<OptimizedRoute> => {
    // Sort waypoints by delivery priority
    const priorityOptimizedWaypoints = [...waypoints].sort((a, b) => {
      const deliveryA = deliveries.find(d => d.id === a.deliveryId);
      const deliveryB = deliveries.find(d => d.id === b.deliveryId);
      
      const priorityA = getPriorityScore(deliveryA);
      const priorityB = getPriorityScore(deliveryB);
      
      return priorityB - priorityA; // Higher priority first
    });

    const route = await locationManager.optimizeRoute(priorityOptimizedWaypoints, startLocation);
    route.id = `${route.id}_priority`;
    return route;
  };

  const selectBestRoute = (alternatives: OptimizedRoute[]): OptimizedRoute => {
    if (alternatives.length === 0) {
      throw new Error('No route alternatives generated');
    }

    // Score each route based on settings
    const scoredRoutes = alternatives.map(route => ({
      route,
      score: calculateRouteScore(route)
    }));

    // Sort by score (lower is better)
    scoredRoutes.sort((a, b) => a.score - b.score);
    
    return scoredRoutes[0].route;
  };

  const calculateRouteScore = (route: OptimizedRoute): number => {
    let score = 0;
    
    // Distance weight
    if (settings.prioritizeDistance) {
      score += route.totalDistance / 1000 * 2; // 2 points per km
    }
    
    // Time weight
    if (settings.prioritizeTime) {
      score += route.totalDuration / 60 * 1; // 1 point per minute
    }
    
    // Waypoint efficiency
    score += route.waypoints.length * 5; // 5 points per stop
    
    return score;
  };

  const getPriorityScore = (delivery: any): number => {
    let score = 0;
    
    // Service type priority
    const typePriority = {
      'express': 10,
      'same_day': 8,
      'next_day': 5,
      'standard': 3
    };
    score += typePriority[delivery.service_type as keyof typeof typePriority] || 0;
    
    // Status priority
    const statusPriority = {
      'confirmed': 10,
      'assigned': 8,
      'pending': 5
    };
    score += statusPriority[delivery.status as keyof typeof statusPriority] || 0;
    
    // Time sensitivity (closer to pickup/delivery time = higher priority)
    if (delivery.pickup_time) {
      const timeToPickup = new Date(delivery.pickup_time).getTime() - Date.now();
      if (timeToPickup < 3600000) { // Less than 1 hour
        score += 15;
      } else if (timeToPickup < 7200000) { // Less than 2 hours
        score += 10;
      }
    }
    
    return score;
  };

  const getEstimatedDuration = (serviceType: string): number => {
    const durations = {
      'express': 300, // 5 minutes
      'same_day': 600, // 10 minutes
      'next_day': 900, // 15 minutes
      'standard': 600 // 10 minutes
    };
    return durations[serviceType as keyof typeof durations] || 600;
  };

  const handleDeliveryToggle = (deliveryId: string) => {
    setSelectedDeliveries(prev => 
      prev.includes(deliveryId)
        ? prev.filter(id => id !== deliveryId)
        : [...prev, deliveryId]
    );
  };

  const handleSelectAll = () => {
    const allIds = deliveries.map(d => d.id);
    setSelectedDeliveries(allIds);
  };

  const handleSelectNone = () => {
    setSelectedDeliveries([]);
  };

  const handleAlternativeSelect = (route: OptimizedRoute) => {
    setCurrentRoute(route);
    onRouteOptimized(route);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Route Optimizer</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {selectedDeliveries.length} of {deliveries.length} selected
            </span>
            <button
              onClick={handleOptimizeRoute}
              disabled={optimizing || selectedDeliveries.length === 0}
              className="px-4 py-2 bg-[#C32C3C] text-white rounded-md hover:bg-[#a82633] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {optimizing ? 'Optimizing...' : 'Optimize Route'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Optimization Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Vehicle Type</h3>
            <select
              value={settings.vehicleType}
              onChange={(e) => setSettings(prev => ({ ...prev, vehicleType: e.target.value as any }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#142C4F] focus:border-transparent"
            >
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="bicycle">Bicycle</option>
              <option value="walking">Walking</option>
            </select>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Optimization Priority</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.prioritizeTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, prioritizeTime: e.target.checked }))}
                  className="rounded border-gray-300 text-[#C32C3C] focus:ring-[#C32C3C]"
                />
                <span className="ml-2 text-sm text-gray-700">Minimize Time</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.prioritizeDistance}
                  onChange={(e) => setSettings(prev => ({ ...prev, prioritizeDistance: e.target.checked }))}
                  className="rounded border-gray-300 text-[#C32C3C] focus:ring-[#C32C3C]"
                />
                <span className="ml-2 text-sm text-gray-700">Minimize Distance</span>
              </label>
            </div>
          </div>
        </div>

        {/* Delivery Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Select Deliveries</h3>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs text-[#142C4F] hover:text-[#1e3a5f]"
              >
                Select All
              </button>
              <button
                onClick={handleSelectNone}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Select None
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
            {deliveries.map((delivery, index) => (
              <div
                key={delivery.id}
                className={`flex items-center p-3 border-b border-gray-100 last:border-b-0 ${
                  selectedDeliveries.includes(delivery.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDeliveries.includes(delivery.id)}
                  onChange={() => handleDeliveryToggle(delivery.id)}
                  className="rounded border-gray-300 text-[#C32C3C] focus:ring-[#C32C3C]"
                />
                
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {delivery.customer_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {delivery.delivery_address}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        delivery.service_type === 'express' ? 'bg-red-100 text-red-800' :
                        delivery.service_type === 'same_day' ? 'bg-orange-100 text-orange-800' :
                        delivery.service_type === 'next_day' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {delivery.service_type}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        #{index + 1}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Route Alternatives */}
        {routeAlternatives.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Route Alternatives</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routeAlternatives.map((route, index) => (
                <div
                  key={route.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    currentRoute?.id === route.id
                      ? 'border-[#C32C3C] bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleAlternativeSelect(route)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">
                      {route.id.includes('original') ? 'Original' :
                       route.id.includes('time') ? 'Time-Optimized' :
                       route.id.includes('distance') ? 'Distance-Optimized' :
                       route.id.includes('priority') ? 'Priority-Based' : `Route ${index + 1}`}
                    </h4>
                    {currentRoute?.id === route.id && (
                      <span className="text-xs bg-[#C32C3C] text-white px-2 py-1 rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Distance:</span>
                      <span>{locationUtils.formatDistance(route.totalDistance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{locationUtils.formatDuration(route.totalDuration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stops:</span>
                      <span>{route.waypoints.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Score:</span>
                      <span>{route.optimizationScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Route Summary */}
        {currentRoute && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Optimized Route Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#142C4F]">
                  {currentRoute.waypoints.length}
                </div>
                <div className="text-xs text-gray-500">Stops</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#142C4F]">
                  {locationUtils.formatDistance(currentRoute.totalDistance)}
                </div>
                <div className="text-xs text-gray-500">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#142C4F]">
                  {locationUtils.formatDuration(currentRoute.totalDuration)}
                </div>
                <div className="text-xs text-gray-500">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#142C4F]">
                  {currentRoute.optimizationScore.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">Score</div>
              </div>
            </div>

            {/* Route Steps */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Route Steps</h4>
              {currentRoute.waypoints.map((waypoint, index) => (
                <div key={index} className="flex items-center text-sm">
                  <div className="w-6 h-6 bg-[#C32C3C] text-white rounded-full flex items-center justify-center text-xs font-medium mr-3">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{waypoint.description}</div>
                    <div className="text-xs text-gray-500">{waypoint.address}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {waypoint.estimatedDuration && locationUtils.formatDuration(waypoint.estimatedDuration)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}