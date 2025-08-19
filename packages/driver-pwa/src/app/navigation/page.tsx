'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapIcon, 
  XMarkIcon, 
  ArrowTopRightOnSquareIcon as NavigationIcon,
  ClockIcon,
  TruckIcon,
  MapPinIcon,
  ArrowPathIcon as RouteIcon,
  ArrowRightIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { useDriver } from '@/providers/DriverProvider';
import { useLocation } from '@/providers/LocationProvider';
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <MapIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    </div>
  )
});

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  coordinates: [number, number];
}

interface OptimizedRoute {
  id: string;
  waypoints: Array<{
    id: string;
    address: string;
    coordinates: [number, number];
    type: 'pickup' | 'delivery';
    assignment_id?: string;
  }>;
  total_distance: number;
  total_duration: number;
  steps: RouteStep[];
}

export default function NavigationPage() {
  const router = useRouter();
  const { assignments } = useDriver();
  const { currentLocation } = useLocation();
  const [selectedRoute, setSelectedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const inProgressAssignments = assignments.filter(a => a.status === 'IN_PROGRESS');
  const assignedAssignments = assignments.filter(a => a.status === 'ASSIGNED');

  useEffect(() => {
    // Auto-optimize route if there are assignments
    if ((inProgressAssignments.length > 0 || assignedAssignments.length > 0) && !selectedRoute) {
      optimizeRoute();
    }
  }, [assignments]);

  const optimizeRoute = async () => {
    if (!currentLocation) {
      alert('Location not available. Please enable GPS.');
      return;
    }

    setIsOptimizing(true);
    
    try {
      // Create waypoints from assignments
      const waypoints = [];
      
      // Add pickup points for assigned deliveries
      assignedAssignments.forEach(assignment => {
        if (assignment.pickup_location.latitude && assignment.pickup_location.longitude) {
          waypoints.push({
            id: `pickup-${assignment.id}`,
            address: assignment.pickup_location.address,
            coordinates: [assignment.pickup_location.longitude, assignment.pickup_location.latitude] as [number, number],
            type: 'pickup' as const,
            assignment_id: assignment.id
          });
        }
      });

      // Add delivery points for all assignments
      [...assignedAssignments, ...inProgressAssignments].forEach(assignment => {
        if (assignment.delivery_location.latitude && assignment.delivery_location.longitude) {
          waypoints.push({
            id: `delivery-${assignment.id}`,
            address: assignment.delivery_location.address,
            coordinates: [assignment.delivery_location.longitude, assignment.delivery_location.latitude] as [number, number],
            type: 'delivery' as const,
            assignment_id: assignment.id
          });
        }
      });

      if (waypoints.length === 0) {
        alert('No locations available for route optimization');
        return;
      }

      // Call route optimization API
      const response = await fetch('/api/driver/route/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`
        },
        body: JSON.stringify({
          start_location: {
            latitude: currentLocation.lat,
            longitude: currentLocation.lng
          },
          waypoints: waypoints.map(wp => ({
            id: wp.id,
            latitude: wp.coordinates[1],
            longitude: wp.coordinates[0],
            address: wp.address,
            type: wp.type,
            assignment_id: wp.assignment_id
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to optimize route');
      }

      const data = await response.json();
      
      // Mock optimized route for now (replace with actual API response)
      const optimizedRoute: OptimizedRoute = {
        id: data.route_id || 'mock-route',
        waypoints,
        total_distance: data.total_distance || calculateTotalDistance(waypoints),
        total_duration: data.total_duration || calculateTotalDuration(waypoints),
        steps: generateRouteSteps(waypoints)
      };

      setSelectedRoute(optimizedRoute);
    } catch (error) {
      console.error('Route optimization failed:', error);
      
      // Fallback: create simple route
      const waypoints = [];
      [...assignedAssignments, ...inProgressAssignments].forEach(assignment => {
        if (assignment.delivery_location.latitude && assignment.delivery_location.longitude) {
          waypoints.push({
            id: `delivery-${assignment.id}`,
            address: assignment.delivery_location.address,
            coordinates: [assignment.delivery_location.longitude, assignment.delivery_location.latitude] as [number, number],
            type: 'delivery' as const,
            assignment_id: assignment.id
          });
        }
      });

      if (waypoints.length > 0) {
        setSelectedRoute({
          id: 'fallback-route',
          waypoints,
          total_distance: calculateTotalDistance(waypoints),
          total_duration: calculateTotalDuration(waypoints),
          steps: generateRouteSteps(waypoints)
        });
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const calculateTotalDistance = (waypoints: any[]) => {
    // Simple distance calculation (replace with actual routing)
    return waypoints.length * 2.5; // km
  };

  const calculateTotalDuration = (waypoints: any[]) => {
    // Simple duration calculation (replace with actual routing)
    return waypoints.length * 15; // minutes
  };

  const generateRouteSteps = (waypoints: any[]): RouteStep[] => {
    return waypoints.map((waypoint, index) => ({
      instruction: `${waypoint.type === 'pickup' ? 'Pick up from' : 'Deliver to'} ${waypoint.address}`,
      distance: 2.5,
      duration: 15,
      coordinates: waypoint.coordinates
    }));
  };

  const startNavigation = () => {
    setIsNavigating(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (selectedRoute && currentStep < selectedRoute.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const openExternalNavigation = (coordinates: [number, number], address: string) => {
    const [lng, lat] = coordinates;
    
    // Try to open in native maps app
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      window.open(`maps://maps.google.com/maps?daddr=${lat},${lng}&amp;ll=`);
    } else if (isAndroid) {
      window.open(`geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(address)})`);
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    }
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-1 hover:bg-primary-600 rounded"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Navigation</h1>
                <p className="text-xs text-primary-100">
                  {isNavigating ? 'Turn-by-turn directions' : 'Route planning'}
                </p>
              </div>
            </div>
            
            {selectedRoute && !isNavigating && (
              <button
                onClick={startNavigation}
                className="bg-accent text-primary px-3 py-1 rounded-lg text-sm font-medium"
              >
                Start
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Route Summary */}
        {selectedRoute && (
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Optimized Route</h3>
              <button
                onClick={optimizeRoute}
                disabled={isOptimizing}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {isOptimizing ? 'Optimizing...' : 'Re-optimize'}
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <RouteIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{formatDistance(selectedRoute.total_distance)}</span>
                </div>
                <p className="text-xs text-gray-500">Distance</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <ClockIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{formatDuration(selectedRoute.total_duration)}</span>
                </div>
                <p className="text-xs text-gray-500">Duration</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <MapPinIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{selectedRoute.waypoints.length}</span>
                </div>
                <p className="text-xs text-gray-500">Stops</p>
              </div>
            </div>

            {!isNavigating && (
              <button
                onClick={startNavigation}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                <NavigationIcon className="h-5 w-5" />
                <span>Start Navigation</span>
              </button>
            )}
          </div>
        )}

        {/* Navigation View */}
        {isNavigating && selectedRoute && (
          <div className="space-y-4">
            {/* Current Step */}
            <div className="bg-blue-600 text-white rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm opacity-90">Step {currentStep + 1} of {selectedRoute.steps.length}</p>
                  <h3 className="text-lg font-medium">{selectedRoute.steps[currentStep]?.instruction}</h3>
                </div>
                <button
                  onClick={() => openExternalNavigation(
                    selectedRoute.steps[currentStep]?.coordinates,
                    selectedRoute.steps[currentStep]?.instruction
                  )}
                  className="bg-blue-700 p-2 rounded-lg"
                >
                  <NavigationIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex items-center space-x-4 text-sm">
                <span>{formatDistance(selectedRoute.steps[currentStep]?.distance || 0)}</span>
                <span>{formatDuration(selectedRoute.steps[currentStep]?.duration || 0)}</span>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex space-x-3">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              
              <button
                onClick={nextStep}
                disabled={currentStep >= selectedRoute.steps.length - 1}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <h3 className="font-medium mb-3">Route Map</h3>
          <MapComponent
            currentLocation={currentLocation}
            route={selectedRoute}
            assignments={assignments}
            height="300px"
          />
        </div>

        {/* Route Steps */}
        {selectedRoute && !isNavigating && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-medium mb-3">Route Steps</h3>
            <div className="space-y-3">
              {selectedRoute.steps.map((step, index) => {
                const waypoint = selectedRoute.waypoints[index];
                const assignment = assignments.find(a => a.id === waypoint?.assignment_id);
                
                return (
                  <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      waypoint?.type === 'pickup' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{step.instruction}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>{formatDistance(step.distance)}</span>
                        <span>{formatDuration(step.duration)}</span>
                      </div>
                      
                      {assignment && (
                        <div className="mt-2 p-2 bg-gray-50 rounded">
                          <p className="text-sm font-medium">#{assignment.tracking_number}</p>
                          <p className="text-xs text-gray-600">{assignment.package_details?.description}</p>
                          {waypoint?.type === 'delivery' && assignment.delivery_location.contact_phone && (
                            <a
                              href={`tel:${assignment.delivery_location.contact_phone}`}
                              className="inline-flex items-center space-x-1 text-xs text-blue-600 mt-1"
                            >
                              <PhoneIcon className="h-3 w-3" />
                              <span>Call recipient</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => openExternalNavigation(step.coordinates, step.instruction)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <NavigationIcon className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Route State */}
        {!selectedRoute && !isOptimizing && assignments.length === 0 && (
          <div className="text-center py-12">
            <MapIcon className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Deliveries Available
            </h2>
            <p className="text-gray-600">
              You don't have any assigned deliveries to navigate to.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isOptimizing && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Optimizing Route
            </h2>
            <p className="text-gray-600">
              Finding the best route for your deliveries...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}