/**
 * Unit tests for LocationServicesManager
 * Tests GPS tracking, route optimization, and geofencing functionality
 */

import { LocationServicesManager } from '../location-services';
import type { 
  LocationCoordinate, 
  RouteOptimizationOptions, 
  GeofenceEvent,
  Delivery 
} from '../types';

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  configurable: true
});

describe('LocationServicesManager', () => {
  let locationManager: LocationServicesManager;
  
  beforeEach(() => {
    locationManager = new LocationServicesManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    locationManager.stopTracking();
  });

  describe('GPS Tracking', () => {
    test('should initialize with default configuration', () => {
      expect(locationManager.isTracking()).toBe(false);
      expect(locationManager.getLastKnownLocation()).toBeNull();
    });

    test('should start GPS tracking successfully', async () => {
      const mockPosition = {
        coords: {
          latitude: 25.276987,
          longitude: 55.296249,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      mockGeolocation.watchPosition.mockReturnValue(1);

      const result = await locationManager.startTracking({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      });

      expect(result.success).toBe(true);
      expect(locationManager.isTracking()).toBe(true);
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    });

    test('should handle GPS permission denied', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error({
          code: 1, // PERMISSION_DENIED
          message: 'User denied the request for Geolocation.'
        });
      });

      const result = await locationManager.startTracking();

      expect(result.success).toBe(false);
      expect(result.error).toBe('GPS permission denied');
      expect(locationManager.isTracking()).toBe(false);
    });

    test('should handle GPS timeout', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error({
          code: 3, // TIMEOUT
          message: 'The request to get user location timed out.'
        });
      });

      const result = await locationManager.startTracking();

      expect(result.success).toBe(false);
      expect(result.error).toBe('GPS timeout');
    });

    test('should stop GPS tracking', () => {
      mockGeolocation.watchPosition.mockReturnValue(1);
      locationManager.startTracking();
      
      locationManager.stopTracking();
      
      expect(locationManager.isTracking()).toBe(false);
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(1);
    });

    test('should validate UAE coordinates', () => {
      // Valid UAE coordinates
      const validCoord: LocationCoordinate = {
        latitude: 25.276987,
        longitude: 55.296249,
        accuracy: 10,
        timestamp: Date.now()
      };
      expect(validCoord).toBeValidUAECoordinate();

      // Invalid coordinates (outside UAE)
      const invalidCoord = {
        latitude: 40.7128, // New York
        longitude: -74.0060,
        accuracy: 10,
        timestamp: Date.now()
      };
      expect(invalidCoord).not.toBeValidUAECoordinate();
    });
  });

  describe('Route Optimization', () => {
    test('should optimize route using nearest neighbor algorithm', async () => {
      const deliveries: Delivery[] = [
        testUtils.createMockDelivery({
          id: 'del1',
          delivery_latitude: 25.276987,
          delivery_longitude: 55.296249
        }),
        testUtils.createMockDelivery({
          id: 'del2', 
          delivery_latitude: 25.197197,
          delivery_longitude: 55.274376
        }),
        testUtils.createMockDelivery({
          id: 'del3',
          delivery_latitude: 25.204849,
          delivery_longitude: 55.270782
        })
      ];

      const startLocation: LocationCoordinate = {
        latitude: 25.286106,
        longitude: 55.317321,
        accuracy: 10,
        timestamp: Date.now()
      };

      const options: RouteOptimizationOptions = {
        algorithm: 'nearest_neighbor',
        vehicleType: 'motorcycle',
        avoidTolls: true,
        optimizeForTime: true
      };

      const result = await locationManager.optimizeRoute(deliveries, startLocation, options);

      expect(result.success).toBe(true);
      expect(result.optimizedRoute).toBeDefined();
      expect(result.optimizedRoute!.deliveries).toHaveLength(3);
      expect(result.optimizedRoute!.totalDistance).toBeGreaterThan(0);
      expect(result.optimizedRoute!.estimatedDuration).toBeGreaterThan(0);
    });

    test('should handle empty delivery list', async () => {
      const startLocation: LocationCoordinate = {
        latitude: 25.276987,
        longitude: 55.296249,
        accuracy: 10,
        timestamp: Date.now()
      };

      const result = await locationManager.optimizeRoute([], startLocation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No deliveries to optimize');
    });

    test('should calculate distance between coordinates', () => {
      const coord1: LocationCoordinate = {
        latitude: 25.276987,
        longitude: 55.296249,
        accuracy: 10,
        timestamp: Date.now()
      };

      const coord2: LocationCoordinate = {
        latitude: 25.197197,
        longitude: 55.274376,
        accuracy: 10,
        timestamp: Date.now()
      };

      const distance = locationManager.calculateDistance(coord1, coord2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20); // Should be less than 20km in Dubai
    });

    test('should handle route optimization for different vehicle types', async () => {
      const deliveries = [testUtils.createMockDelivery()];
      const startLocation = testUtils.createMockLocation();

      // Test motorcycle optimization
      const motorcycleResult = await locationManager.optimizeRoute(
        deliveries, 
        startLocation, 
        { vehicleType: 'motorcycle' }
      );
      expect(motorcycleResult.success).toBe(true);

      // Test van optimization  
      const vanResult = await locationManager.optimizeRoute(
        deliveries,
        startLocation,
        { vehicleType: 'van' }
      );
      expect(vanResult.success).toBe(true);
    });
  });

  describe('Geofencing', () => {
    test('should create geofence successfully', async () => {
      const center: LocationCoordinate = {
        latitude: 25.276987,
        longitude: 55.296249,
        accuracy: 10,
        timestamp: Date.now()
      };

      const result = await locationManager.createGeofence(
        'test-geofence',
        center,
        100, // 100 meter radius
        ['enter', 'exit']
      );

      expect(result.success).toBe(true);
      expect(result.geofenceId).toBe('test-geofence');
    });

    test('should detect geofence entry', () => {
      const geofenceCenter: LocationCoordinate = {
        latitude: 25.276987,
        longitude: 55.296249,
        accuracy: 10,
        timestamp: Date.now()
      };

      // Create geofence
      locationManager.createGeofence('test-fence', geofenceCenter, 100, ['enter']);

      // Simulate location inside geofence
      const insideLocation: LocationCoordinate = {
        latitude: 25.277000, // Very close to center
        longitude: 55.296250,
        accuracy: 5,
        timestamp: Date.now()
      };

      const isInside = locationManager.isLocationInGeofence('test-fence', insideLocation);
      expect(isInside).toBe(true);
    });

    test('should detect geofence exit', () => {
      const geofenceCenter: LocationCoordinate = {
        latitude: 25.276987,
        longitude: 55.296249,
        accuracy: 10,
        timestamp: Date.now()
      };

      locationManager.createGeofence('test-fence', geofenceCenter, 100, ['exit']);

      // Simulate location outside geofence
      const outsideLocation: LocationCoordinate = {
        latitude: 25.280000, // Far from center
        longitude: 55.300000,
        accuracy: 5,
        timestamp: Date.now()
      };

      const isInside = locationManager.isLocationInGeofence('test-fence', outsideLocation);
      expect(isInside).toBe(false);
    });

    test('should handle geofence events', (done) => {
      const geofenceCenter = testUtils.createMockLocation();
      
      locationManager.createGeofence('delivery-zone', geofenceCenter, 50, ['enter']);
      
      locationManager.on('geofence', (event: GeofenceEvent) => {
        expect(event.geofenceId).toBe('delivery-zone');
        expect(event.eventType).toBe('enter');
        expect(event.location).toBeDefined();
        done();
      });

      // Simulate entering geofence
      const insideLocation = {
        ...geofenceCenter,
        latitude: geofenceCenter.latitude + 0.0001
      };
      
      locationManager.checkGeofences(insideLocation);
    });

    test('should remove geofence', async () => {
      const center = testUtils.createMockLocation();
      await locationManager.createGeofence('temp-fence', center, 100, ['enter']);
      
      const result = await locationManager.removeGeofence('temp-fence');
      
      expect(result.success).toBe(true);
    });
  });

  describe('Background Tracking', () => {
    test('should handle background location updates', async () => {
      const result = await locationManager.enableBackgroundTracking({
        interval: 30000, // 30 seconds
        distanceFilter: 10, // 10 meters
        saveToStorage: true
      });

      expect(result.success).toBe(true);
    });

    test('should batch location updates for efficiency', async () => {
      const locations: LocationCoordinate[] = [
        testUtils.createMockLocation({ timestamp: Date.now() - 60000 }),
        testUtils.createMockLocation({ timestamp: Date.now() - 30000 }),
        testUtils.createMockLocation({ timestamp: Date.now() })
      ];

      const result = await locationManager.batchLocationUpdate(locations);
      
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(3);
    });

    test('should optimize battery usage', () => {
      const batteryConfig = locationManager.getBatteryOptimizationConfig();
      
      expect(batteryConfig).toHaveProperty('adaptiveTracking');
      expect(batteryConfig).toHaveProperty('powerSavingMode');
      expect(batteryConfig.adaptiveTracking).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle network connectivity issues', async () => {
      // Mock network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await locationManager.syncWithServer();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('network');
    });

    test('should handle invalid coordinates', () => {
      const invalidCoords = {
        latitude: 200, // Invalid latitude
        longitude: 300, // Invalid longitude
        accuracy: 10,
        timestamp: Date.now()
      };

      expect(() => {
        locationManager.validateCoordinates(invalidCoords);
      }).toThrow('Invalid coordinates');
    });

    test('should handle GPS hardware unavailable', async () => {
      // Mock geolocation not available
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        configurable: true
      });

      const newManager = new LocationServicesManager();
      const result = await newManager.startTracking();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Geolocation not supported');
    });
  });

  describe('Performance', () => {
    test('should handle large number of deliveries efficiently', async () => {
      // Create 100 mock deliveries
      const deliveries = Array.from({ length: 100 }, (_, i) => 
        testUtils.createMockDelivery({
          id: `delivery_${i}`,
          delivery_latitude: 25.0 + (Math.random() * 0.5),
          delivery_longitude: 55.0 + (Math.random() * 0.5)
        })
      );

      const startLocation = testUtils.createMockLocation();
      const startTime = Date.now();

      const result = await locationManager.optimizeRoute(deliveries, startLocation);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    test('should maintain location accuracy over time', async () => {
      const locations: LocationCoordinate[] = [];
      
      // Simulate receiving multiple location updates
      for (let i = 0; i < 10; i++) {
        const location = testUtils.createMockLocation({
          accuracy: 5 + Math.random() * 10, // Random accuracy between 5-15m
          timestamp: Date.now() + (i * 1000)
        });
        locations.push(location);
      }

      const accuracy = locationManager.calculateAverageAccuracy(locations);
      expect(accuracy).toBeGreaterThan(0);
      expect(accuracy).toBeLessThan(20);
    });
  });
});