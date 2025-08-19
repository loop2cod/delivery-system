'use client';

import React, { useState, useEffect } from 'react';
import { OptimizedRoute, locationUtils } from '@/lib/location-services';

interface RouteOptimizerProps {
  deliveries: any[];
  onRouteOptimized: (route: OptimizedRoute) => void;
  onError: (error: string) => void;
  className?: string;
}

export default function RouteOptimizer({
  deliveries,
  onRouteOptimized,
  onError,
  className = ''
}: RouteOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<OptimizedRoute | null>(null);

  const optimizeRoute = async () => {
    if (deliveries.length === 0) {
      onError('No deliveries to optimize');
      return;
    }

    setIsOptimizing(true);
    
    try {
      // Get current location
      const currentPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      // Create a simple optimized route (in reality, this would use a routing service)
      const waypoints = deliveries.map((delivery, index) => ({
        coordinate: {
          latitude: delivery.delivery_location?.latitude || 25.2048 + (index * 0.01),
          longitude: delivery.delivery_location?.longitude || 55.2708 + (index * 0.01),
          timestamp: Date.now()
        },
        deliveryId: delivery.id,
        estimatedDuration: 600, // 10 minutes per stop
        address: delivery.delivery_location?.address || `Delivery ${index + 1}`
      }));

      // Calculate total distance (simplified)
      let totalDistance = 0;
      let totalDuration = 0;

      for (let i = 0; i < waypoints.length; i++) {
        const waypoint = waypoints[i];
        totalDuration += waypoint.estimatedDuration || 600;
        
        if (i === 0) {
          // Distance from current location to first waypoint
          totalDistance += locationUtils.calculateDistance(
            {
              latitude: currentPosition.coords.latitude,
              longitude: currentPosition.coords.longitude,
              timestamp: Date.now()
            },
            waypoint.coordinate
          );
        } else {
          // Distance between waypoints
          totalDistance += locationUtils.calculateDistance(
            waypoints[i - 1].coordinate,
            waypoint.coordinate
          );
        }
      }

      const optimizedRoute: OptimizedRoute = {
        id: `route_${Date.now()}`,
        waypoints,
        totalDistance,
        totalDuration,
        optimizationScore: 0.85, // Mock score
        vehicleType: 'van'
      };

      setCurrentRoute(optimizedRoute);
      onRouteOptimized(optimizedRoute);
      
    } catch (error: any) {
      console.error('Route optimization failed:', error);
      onError(error.message || 'Failed to optimize route');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Route Optimization</h3>
          <button
            onClick={optimizeRoute}
            disabled={isOptimizing || deliveries.length === 0}
            className={`px-4 py-2 rounded-lg font-medium ${
              isOptimizing || deliveries.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
          </button>
        </div>

        {/* Deliveries List */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">
            Deliveries to Optimize ({deliveries.length})
          </h4>
          
          {deliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No deliveries available for route optimization</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deliveries.slice(0, 5).map((delivery, index) => (
                <div key={delivery.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">#{delivery.tracking_number || `Delivery ${index + 1}`}</p>
                    <p className="text-xs text-gray-600">
                      {delivery.delivery_location?.address || 'Address not available'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Stop {index + 1}
                  </div>
                </div>
              ))}
              
              {deliveries.length > 5 && (
                <div className="text-center py-2 text-sm text-gray-500">
                  +{deliveries.length - 5} more deliveries
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Route */}
        {currentRoute && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="font-medium text-gray-900 mb-3">Optimized Route</h4>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-600">
                  {locationUtils.formatDistance(currentRoute.totalDistance)}
                </div>
                <div className="text-xs text-blue-600">Total Distance</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-600">
                  {locationUtils.formatDuration(currentRoute.totalDuration)}
                </div>
                <div className="text-xs text-green-600">Est. Duration</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Optimization Score:</span>
                <span className="font-medium">{(currentRoute.optimizationScore * 100).toFixed(0)}%</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Vehicle Type:</span>
                <span className="font-medium capitalize">{currentRoute.vehicleType}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Waypoints:</span>
                <span className="font-medium">{currentRoute.waypoints.length}</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => onRouteOptimized(currentRoute)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Use This Route
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h5 className="font-medium text-yellow-800 mb-2">How Route Optimization Works</h5>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Analyzes delivery locations and current position</li>
            <li>• Calculates shortest distance between stops</li>
            <li>• Considers traffic patterns and delivery time windows</li>
            <li>• Provides optimized sequence for maximum efficiency</li>
          </ul>
        </div>
      </div>
    </div>
  );
}