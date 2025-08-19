// Location services for driver PWA
export interface LocationCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface GeofenceBoundary {
  id: string;
  type: 'delivery' | 'pickup' | 'zone';
  center: LocationCoordinate;
  radius: number;
  metadata?: {
    deliveryId?: string;
    customerName?: string;
    address?: string;
  };
}

export interface RouteWaypoint {
  coordinate: LocationCoordinate;
  deliveryId?: string;
  estimatedDuration?: number;
  address?: string;
}

export interface OptimizedRoute {
  id: string;
  waypoints: RouteWaypoint[];
  totalDistance: number;
  totalDuration: number;
  optimizationScore: number;
  vehicleType: string;
}

export class LocationServicesManager {
  private watchId: number | null = null;
  private geofences: GeofenceBoundary[] = [];
  private onLocationUpdate?: (location: LocationCoordinate) => void;
  private onGeofenceEvent?: (event: { type: 'enter' | 'exit'; geofence: GeofenceBoundary; location: LocationCoordinate }) => void;
  private onError?: (error: string) => void;

  constructor(options: {
    onLocationUpdate?: (location: LocationCoordinate) => void;
    onGeofenceEvent?: (event: { type: 'enter' | 'exit'; geofence: GeofenceBoundary; location: LocationCoordinate }) => void;
    onError?: (error: string) => void;
  }) {
    this.onLocationUpdate = options.onLocationUpdate;
    this.onGeofenceEvent = options.onGeofenceEvent;
    this.onError = options.onError;
  }

  startTracking(options: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  } = {}) {
    if (!navigator.geolocation) {
      this.onError?.('Geolocation is not supported by this browser');
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options
    };

    this.watchId = navigator.geolocation.watchPosition(
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

        this.onLocationUpdate?.(location);
        this.checkGeofences(location);
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
        this.onError?.(errorMessage);
      },
      defaultOptions
    );
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  addGeofence(geofence: GeofenceBoundary) {
    this.geofences.push(geofence);
  }

  removeGeofence(geofenceId: string) {
    this.geofences = this.geofences.filter(g => g.id !== geofenceId);
  }

  private checkGeofences(location: LocationCoordinate) {
    this.geofences.forEach(geofence => {
      const distance = this.calculateDistance(location, geofence.center);
      const isInside = distance <= geofence.radius;
      
      // Simple geofence logic - you might want to track enter/exit state
      if (isInside) {
        this.onGeofenceEvent?.({
          type: 'enter',
          geofence,
          location
        });
      }
    });
  }

  private calculateDistance(coord1: LocationCoordinate, coord2: LocationCoordinate): number {
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
}

export const locationUtils = {
  formatDistance: (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  },

  formatDuration: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  },

  formatCoordinates: (location: LocationCoordinate): string => {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  },

  calculateDistance: (coord1: LocationCoordinate, coord2: LocationCoordinate): number => {
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
};