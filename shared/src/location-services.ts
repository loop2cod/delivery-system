// Advanced location services for GPS tracking and route optimization
export interface LocationCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface RouteWaypoint {
  coordinate: LocationCoordinate;
  address?: string;
  description?: string;
  arrivalTime?: number;
  departureTime?: number;
  deliveryId?: string;
  estimatedDuration?: number;
}

export interface RouteSegment {
  start: LocationCoordinate;
  end: LocationCoordinate;
  distance: number; // in meters
  duration: number; // in seconds
  instructions: string[];
  polyline?: string;
}

export interface OptimizedRoute {
  id: string;
  waypoints: RouteWaypoint[];
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  estimatedFuelCost?: number;
  optimizationScore: number;
  createdAt: number;
  vehicleType?: 'car' | 'motorcycle' | 'bicycle' | 'walking';
}

export interface TrackingConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  distanceFilter: number; // Minimum distance in meters to trigger update
  timeFilter: number; // Minimum time in ms between updates
  backgroundTracking: boolean;
}

export interface GeofenceBoundary {
  id: string;
  center: LocationCoordinate;
  radius: number; // in meters
  type: 'pickup' | 'delivery' | 'hub' | 'restricted';
  metadata?: Record<string, any>;
}

class LocationServicesManager {
  private watchId: number | null = null;
  private lastKnownLocation: LocationCoordinate | null = null;
  private trackingActive: boolean = false;
  private locationHistory: LocationCoordinate[] = [];
  private geofences: GeofenceBoundary[] = [];
  private routeCache = new Map<string, OptimizedRoute>();
  private config: TrackingConfig = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
    distanceFilter: 5, // 5 meters
    timeFilter: 5000, // 5 seconds
    backgroundTracking: true
  };

  private eventHandlers = new Map<string, Set<Function>>();

  constructor(config?: Partial<TrackingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initializeLocationServices();
  }

  // Event handling
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[LocationServices] Event handler error for ${event}:`, error);
      }
    });
  }

  // Initialize location services
  private async initializeLocationServices(): Promise<void> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    // Request permissions
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        throw new Error('Geolocation permission denied');
      }
    } catch (error) {
      console.warn('[LocationServices] Permission check failed:', error);
    }

    // Get initial position
    try {
      const position = await this.getCurrentPosition();
      this.lastKnownLocation = this.positionToCoordinate(position);
      this.emit('locationUpdate', this.lastKnownLocation);
    } catch (error) {
      console.error('[LocationServices] Failed to get initial position:', error);
    }
  }

  // Get current position
  async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge
        }
      );
    });
  }

  // Start continuous location tracking
  async startTracking(): Promise<void> {
    if (this.trackingActive) {
      return;
    }

    this.trackingActive = true;
    let lastUpdateTime = 0;
    let lastLocation: LocationCoordinate | null = null;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        const coordinate = this.positionToCoordinate(position);

        // Apply filters
        if (lastLocation && lastUpdateTime) {
          const timeDiff = now - lastUpdateTime;
          const distance = this.calculateDistance(lastLocation, coordinate);

          if (timeDiff < this.config.timeFilter && distance < this.config.distanceFilter) {
            return; // Skip update due to filters
          }
        }

        this.lastKnownLocation = coordinate;
        this.locationHistory.push(coordinate);

        // Keep only last 100 locations
        if (this.locationHistory.length > 100) {
          this.locationHistory = this.locationHistory.slice(-100);
        }

        lastLocation = coordinate;
        lastUpdateTime = now;

        this.emit('locationUpdate', coordinate);
        this.checkGeofences(coordinate);
      },
      (error) => {
        console.error('[LocationServices] Tracking error:', error);
        this.emit('locationError', error);
      },
      {
        enableHighAccuracy: this.config.enableHighAccuracy,
        timeout: this.config.timeout,
        maximumAge: this.config.maximumAge
      }
    );

    console.log('[LocationServices] Tracking started');
    this.emit('trackingStarted', { config: this.config });
  }

  // Stop location tracking
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.trackingActive = false;
    console.log('[LocationServices] Tracking stopped');
    this.emit('trackingStopped', {});
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(coord1: LocationCoordinate, coord2: LocationCoordinate): number {
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
  }

  // Calculate bearing between two coordinates
  calculateBearing(coord1: LocationCoordinate, coord2: LocationCoordinate): number {
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(x, y);
    return ((θ * 180 / Math.PI) + 360) % 360;
  }

  // Optimize route for multiple waypoints using nearest neighbor algorithm
  async optimizeRoute(waypoints: RouteWaypoint[], startLocation?: LocationCoordinate): Promise<OptimizedRoute> {
    const start = startLocation || this.lastKnownLocation;
    if (!start) {
      throw new Error('No start location available');
    }

    if (waypoints.length <= 2) {
      // Simple route, no optimization needed
      return this.calculateSimpleRoute(waypoints, start);
    }

    // Implement nearest neighbor TSP approximation
    const optimizedWaypoints = await this.nearestNeighborOptimization(waypoints, start);
    const route = await this.calculateRouteSegments(optimizedWaypoints, start);

    const routeId = `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.routeCache.set(routeId, route);

    this.emit('routeOptimized', route);
    return route;
  }

  // Nearest neighbor algorithm for route optimization
  private async nearestNeighborOptimization(waypoints: RouteWaypoint[], start: LocationCoordinate): Promise<RouteWaypoint[]> {
    const unvisited = [...waypoints];
    const optimized: RouteWaypoint[] = [];
    let currentLocation = start;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = this.calculateDistance(currentLocation, unvisited[0].coordinate);

      for (let i = 1; i < unvisited.length; i++) {
        const distance = this.calculateDistance(currentLocation, unvisited[i].coordinate);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const nearest = unvisited.splice(nearestIndex, 1)[0];
      optimized.push(nearest);
      currentLocation = nearest.coordinate;
    }

    return optimized;
  }

  // Calculate route segments with directions
  private async calculateRouteSegments(waypoints: RouteWaypoint[], start: LocationCoordinate): Promise<OptimizedRoute> {
    const segments: RouteSegment[] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    let currentLocation = start;

    for (const waypoint of waypoints) {
      const segment = await this.calculateSegment(currentLocation, waypoint.coordinate);
      segments.push(segment);
      totalDistance += segment.distance;
      totalDuration += segment.duration;
      currentLocation = waypoint.coordinate;
    }

    // Calculate optimization score (lower is better)
    const optimizationScore = this.calculateOptimizationScore(totalDistance, totalDuration, waypoints.length);

    return {
      id: `route_${Date.now()}`,
      waypoints,
      segments,
      totalDistance,
      totalDuration,
      optimizationScore,
      createdAt: Date.now(),
      vehicleType: 'car'
    };
  }

  // Calculate individual route segment
  private async calculateSegment(start: LocationCoordinate, end: LocationCoordinate): Promise<RouteSegment> {
    const distance = this.calculateDistance(start, end);
    const averageSpeed = 40; // km/h average urban speed
    const duration = (distance / 1000) / averageSpeed * 3600; // seconds

    // Generate basic instructions
    const bearing = this.calculateBearing(start, end);
    const direction = this.bearingToDirection(bearing);
    const instructions = [
      `Head ${direction} for ${Math.round(distance)}m`,
      `Continue straight`,
      'Arrive at destination'
    ];

    return {
      start,
      end,
      distance,
      duration,
      instructions
    };
  }

  // Calculate simple route without optimization
  private async calculateSimpleRoute(waypoints: RouteWaypoint[], start: LocationCoordinate): Promise<OptimizedRoute> {
    return this.calculateRouteSegments(waypoints, start);
  }

  // Calculate optimization score
  private calculateOptimizationScore(distance: number, duration: number, waypointCount: number): number {
    // Normalized score based on distance per waypoint and time efficiency
    const distanceScore = distance / waypointCount / 1000; // km per waypoint
    const timeScore = duration / waypointCount / 60; // minutes per waypoint
    return distanceScore + timeScore;
  }

  // Convert bearing to compass direction
  private bearingToDirection(bearing: number): string {
    const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  // Geofencing
  addGeofence(geofence: GeofenceBoundary): void {
    this.geofences.push(geofence);
    console.log(`[LocationServices] Geofence added: ${geofence.id}`);
  }

  removeGeofence(geofenceId: string): void {
    this.geofences = this.geofences.filter(g => g.id !== geofenceId);
    console.log(`[LocationServices] Geofence removed: ${geofenceId}`);
  }

  private checkGeofences(location: LocationCoordinate): void {
    for (const geofence of this.geofences) {
      const distance = this.calculateDistance(location, geofence.center);
      const isInside = distance <= geofence.radius;

      this.emit('geofenceUpdate', {
        geofence,
        location,
        isInside,
        distance
      });

      if (isInside) {
        this.emit('geofenceEnter', { geofence, location });
      }
    }
  }

  // Utility methods
  private positionToCoordinate(position: GeolocationPosition): LocationCoordinate {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude ?? undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
      heading: position.coords.heading ?? undefined,
      speed: position.coords.speed ?? undefined,
      timestamp: position.timestamp
    };
  }

  // Get route from cache
  getCachedRoute(routeId: string): OptimizedRoute | null {
    return this.routeCache.get(routeId) || null;
  }

  // Clear route cache
  clearRouteCache(): void {
    this.routeCache.clear();
  }

  // Get current tracking status
  getTrackingStatus(): {
    active: boolean;
    lastLocation: LocationCoordinate | null;
    historyCount: number;
    geofenceCount: number;
  } {
    return {
      active: this.trackingActive,
      lastLocation: this.lastKnownLocation,
      historyCount: this.locationHistory.length,
      geofenceCount: this.geofences.length
    };
  }

  // Get location history
  getLocationHistory(limit?: number): LocationCoordinate[] {
    if (limit && limit < this.locationHistory.length) {
      return this.locationHistory.slice(-limit);
    }
    return [...this.locationHistory];
  }

  // Update configuration
  updateConfig(newConfig: Partial<TrackingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart tracking if active to apply new config
    if (this.trackingActive) {
      this.stopTracking();
      this.startTracking();
    }
  }

  // Estimate travel time between locations
  estimateTravelTime(from: LocationCoordinate, to: LocationCoordinate, vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'walking' = 'car'): number {
    const distance = this.calculateDistance(from, to);
    const speeds = {
      car: 40, // km/h
      motorcycle: 35,
      bicycle: 15,
      walking: 5
    };
    
    const speed = speeds[vehicleType];
    return (distance / 1000) / speed * 3600; // seconds
  }

  // Check if location services are available
  static isAvailable(): boolean {
    return 'geolocation' in navigator;
  }

  // Get current permission state
  static async getPermissionState(): Promise<PermissionState> {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch (error) {
      return 'prompt';
    }
  }
}

export default LocationServicesManager;

// Utility functions
export const locationUtils = {
  // Format coordinates for display
  formatCoordinates: (coord: LocationCoordinate): string => {
    return `${coord.latitude.toFixed(6)}, ${coord.longitude.toFixed(6)}`;
  },

  // Convert meters to human-readable distance
  formatDistance: (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  },

  // Convert seconds to human-readable duration
  formatDuration: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  },

  // Check if coordinate is valid
  isValidCoordinate: (coord: any): coord is LocationCoordinate => {
    return coord &&
           typeof coord.latitude === 'number' &&
           typeof coord.longitude === 'number' &&
           coord.latitude >= -90 && coord.latitude <= 90 &&
           coord.longitude >= -180 && coord.longitude <= 180 &&
           typeof coord.timestamp === 'number';
  },

  // Create waypoint from delivery
  createWaypointFromDelivery: (delivery: any): RouteWaypoint => {
    return {
      coordinate: {
        latitude: delivery.delivery_latitude,
        longitude: delivery.delivery_longitude,
        timestamp: Date.now()
      },
      address: delivery.delivery_address,
      description: delivery.service_type,
      deliveryId: delivery.id,
      estimatedDuration: delivery.estimated_duration || 600 // 10 minutes default
    };
  }
};

export { LocationServicesManager };