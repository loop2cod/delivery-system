/**
 * Integration tests for GPS tracking API endpoints
 * Tests backend API functionality for location tracking and route optimization
 */

import request from 'supertest';
import { build } from '../../app';
import type { FastifyInstance } from 'fastify';
import type { LocationUpdateRequest, RouteOptimizationRequest } from '../../types/gps';

describe('GPS Tracking API Integration', () => {
  let app: FastifyInstance;
  let authToken: string;
  let driverId: string;
  let deliveryId: string;

  beforeAll(async () => {
    app = build({ logger: false });
    await app.ready();

    // Create test driver and get auth token
    const driverResponse = await request(app.server)
      .post('/api/auth/register')
      .send({
        name: 'Test Driver',
        email: 'driver@test.com',
        password: 'password123',
        role: 'driver',
        phone: '+971501234567'
      });

    driverId = driverResponse.body.user.id;

    const loginResponse = await request(app.server)
      .post('/api/auth/login')
      .send({
        email: 'driver@test.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;

    // Create test delivery
    const deliveryResponse = await request(app.server)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testUtils.createMockDelivery({
        driver_id: driverId,
        status: 'assigned'
      }));

    deliveryId = deliveryResponse.body.delivery.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/driver/location', () => {
    test('should update driver location successfully', async () => {
      const locationUpdate: LocationUpdateRequest = {
        delivery_id: deliveryId,
        latitude: 25.276987,
        longitude: 55.296249,
        accuracy: 8,
        speed: 45,
        heading: 180,
        timestamp: Date.now()
      };

      const response = await request(app.server)
        .post('/api/driver/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send(locationUpdate);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.location_id).toBeDefined();
    });

    test('should validate UAE coordinates', async () => {
      const invalidLocationUpdate = {
        delivery_id: deliveryId,
        latitude: 40.7128, // New York coordinates (outside UAE)
        longitude: -74.0060,
        accuracy: 10,
        timestamp: Date.now()
      };

      const response = await request(app.server)
        .post('/api/driver/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidLocationUpdate);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('coordinates outside UAE');
    });

    test('should require authentication', async () => {
      const locationUpdate = {
        delivery_id: deliveryId,
        latitude: 25.276987,
        longitude: 55.296249,
        accuracy: 10,
        timestamp: Date.now()
      };

      const response = await request(app.server)
        .post('/api/driver/location')
        .send(locationUpdate);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    test('should validate required fields', async () => {
      const incompleteUpdate = {
        delivery_id: deliveryId,
        latitude: 25.276987
        // Missing longitude, accuracy, timestamp
      };

      const response = await request(app.server)
        .post('/api/driver/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteUpdate);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('should handle high-frequency updates', async () => {
      const locations = Array.from({ length: 10 }, (_, i) => ({
        delivery_id: deliveryId,
        latitude: 25.276987 + (i * 0.001),
        longitude: 55.296249 + (i * 0.001),
        accuracy: 5 + Math.random() * 10,
        timestamp: Date.now() + (i * 1000)
      }));

      const promises = locations.map(location =>
        request(app.server)
          .post('/api/driver/location')
          .set('Authorization', `Bearer ${authToken}`)
          .send(location)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('should filter out low accuracy locations', async () => {
      const lowAccuracyUpdate = {
        delivery_id: deliveryId,
        latitude: 25.276987,
        longitude: 55.296249,
        accuracy: 100, // Very low accuracy
        timestamp: Date.now()
      };

      const response = await request(app.server)
        .post('/api/driver/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send(lowAccuracyUpdate);

      expect(response.status).toBe(200);
      expect(response.body.filtered).toBe(true);
      expect(response.body.reason).toContain('accuracy too low');
    });
  });

  describe('POST /api/driver/location/batch', () => {
    test('should handle batch location updates', async () => {
      const batchUpdates = Array.from({ length: 5 }, (_, i) => ({
        delivery_id: deliveryId,
        latitude: 25.276987 + (i * 0.001),
        longitude: 55.296249 + (i * 0.001),
        accuracy: 8,
        timestamp: Date.now() - (5000 - i * 1000)
      }));

      const response = await request(app.server)
        .post('/api/driver/location/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ locations: batchUpdates });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.processed_count).toBe(5);
      expect(response.body.location_ids).toHaveLength(5);
    });

    test('should validate batch size limits', async () => {
      const largeBatch = Array.from({ length: 101 }, (_, i) => ({
        delivery_id: deliveryId,
        latitude: 25.276987,
        longitude: 55.296249,
        accuracy: 10,
        timestamp: Date.now() + i
      }));

      const response = await request(app.server)
        .post('/api/driver/location/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ locations: largeBatch });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('batch size exceeds limit');
    });

    test('should handle partial batch failures gracefully', async () => {
      const mixedBatch = [
        {
          delivery_id: deliveryId,
          latitude: 25.276987,
          longitude: 55.296249,
          accuracy: 8,
          timestamp: Date.now()
        },
        {
          delivery_id: deliveryId,
          latitude: 40.7128, // Invalid UAE coordinate
          longitude: -74.0060,
          accuracy: 10,
          timestamp: Date.now()
        },
        {
          delivery_id: deliveryId,
          latitude: 25.197197,
          longitude: 55.274376,
          accuracy: 12,
          timestamp: Date.now()
        }
      ];

      const response = await request(app.server)
        .post('/api/driver/location/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ locations: mixedBatch });

      expect(response.status).toBe(207); // Partial success
      expect(response.body.success_count).toBe(2);
      expect(response.body.failure_count).toBe(1);
      expect(response.body.failures).toHaveLength(1);
    });
  });

  describe('GET /api/driver/location/history', () => {
    beforeEach(async () => {
      // Add some location history
      const locations = Array.from({ length: 3 }, (_, i) => ({
        delivery_id: deliveryId,
        latitude: 25.276987 + (i * 0.01),
        longitude: 55.296249 + (i * 0.01),
        accuracy: 10,
        timestamp: Date.now() - (3600000 - i * 1200000) // Last 3 hours
      }));

      for (const location of locations) {
        await request(app.server)
          .post('/api/driver/location')
          .set('Authorization', `Bearer ${authToken}`)
          .send(location);
      }
    });

    test('should retrieve location history', async () => {
      const response = await request(app.server)
        .get(`/api/driver/location/history?delivery_id=${deliveryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.locations).toBeInstanceOf(Array);
      expect(response.body.locations.length).toBeGreaterThan(0);
    });

    test('should support time range filtering', async () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;

      const response = await request(app.server)
        .get(`/api/driver/location/history?delivery_id=${deliveryId}&start_time=${oneHourAgo}&end_time=${now}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.locations).toBeInstanceOf(Array);
      
      // All locations should be within the time range
      response.body.locations.forEach((location: any) => {
        expect(new Date(location.recorded_at).getTime()).toBeGreaterThanOrEqual(oneHourAgo);
        expect(new Date(location.recorded_at).getTime()).toBeLessThanOrEqual(now);
      });
    });

    test('should support pagination', async () => {
      const response = await request(app.server)
        .get(`/api/driver/location/history?delivery_id=${deliveryId}&limit=2&offset=0`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.locations).toHaveLength(2);
      expect(response.body.total_count).toBeGreaterThan(2);
      expect(response.body.has_more).toBe(true);
    });
  });

  describe('POST /api/route/optimize', () => {
    test('should optimize delivery route', async () => {
      // Create multiple deliveries for optimization
      const deliveries = await Promise.all([
        request(app.server)
          .post('/api/deliveries')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testUtils.createMockDelivery({
            driver_id: driverId,
            delivery_latitude: 25.080328,
            delivery_longitude: 55.139309
          })),
        request(app.server)
          .post('/api/deliveries')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testUtils.createMockDelivery({
            driver_id: driverId,
            delivery_latitude: 25.197197,
            delivery_longitude: 55.274376
          }))
      ]);

      const deliveryIds = deliveries.map(d => d.body.delivery.id);

      const optimizationRequest: RouteOptimizationRequest = {
        delivery_ids: deliveryIds,
        start_location: {
          latitude: 25.276987,
          longitude: 55.296249
        },
        vehicle_type: 'motorcycle',
        algorithm: 'nearest_neighbor',
        preferences: {
          avoid_tolls: true,
          optimize_for_time: true
        }
      };

      const response = await request(app.server)
        .post('/api/route/optimize')
        .set('Authorization', `Bearer ${authToken}`)
        .send(optimizationRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.optimized_route).toBeDefined();
      expect(response.body.optimized_route.deliveries).toHaveLength(2);
      expect(response.body.optimized_route.total_distance).toBeGreaterThan(0);
      expect(response.body.optimized_route.estimated_duration).toBeGreaterThan(0);
    });

    test('should handle empty delivery list', async () => {
      const optimizationRequest: RouteOptimizationRequest = {
        delivery_ids: [],
        start_location: {
          latitude: 25.276987,
          longitude: 55.296249
        },
        vehicle_type: 'motorcycle'
      };

      const response = await request(app.server)
        .post('/api/route/optimize')
        .set('Authorization', `Bearer ${authToken}`)
        .send(optimizationRequest);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('no deliveries');
    });

    test('should validate vehicle type', async () => {
      const optimizationRequest = {
        delivery_ids: [deliveryId],
        start_location: {
          latitude: 25.276987,
          longitude: 55.296249
        },
        vehicle_type: 'invalid_vehicle' // Invalid vehicle type
      };

      const response = await request(app.server)
        .post('/api/route/optimize')
        .set('Authorization', `Bearer ${authToken}`)
        .send(optimizationRequest);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalid vehicle type');
    });
  });

  describe('POST /api/geofence', () => {
    test('should create geofence successfully', async () => {
      const geofenceRequest = {
        name: 'delivery_zone_1',
        center: {
          latitude: 25.276987,
          longitude: 55.296249
        },
        radius: 100,
        events: ['enter', 'exit'],
        delivery_id: deliveryId
      };

      const response = await request(app.server)
        .post('/api/geofence')
        .set('Authorization', `Bearer ${authToken}`)
        .send(geofenceRequest);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.geofence_id).toBeDefined();
    });

    test('should validate geofence radius', async () => {
      const invalidGeofence = {
        name: 'large_zone',
        center: {
          latitude: 25.276987,
          longitude: 55.296249
        },
        radius: 5000, // Too large (> 1000m limit)
        events: ['enter'],
        delivery_id: deliveryId
      };

      const response = await request(app.server)
        .post('/api/geofence')  
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidGeofence);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('radius too large');
    });
  });

  describe('POST /api/geofence/check', () => {
    let geofenceId: string;

    beforeEach(async () => {
      // Create a test geofence
      const geofenceResponse = await request(app.server)
        .post('/api/geofence')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test_zone',
          center: {
            latitude: 25.276987,
            longitude: 55.296249
          },
          radius: 50,
          events: ['enter', 'exit'],
          delivery_id: deliveryId
        });

      geofenceId = geofenceResponse.body.geofence_id;
    });

    test('should detect geofence entry', async () => {
      const checkRequest = {
        geofence_id: geofenceId,
        location: {
          latitude: 25.277000, // Inside geofence
          longitude: 55.296250,
          accuracy: 10
        }
      };

      const response = await request(app.server)
        .post('/api/geofence/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkRequest);

      expect(response.status).toBe(200);
      expect(response.body.inside_geofence).toBe(true);
      expect(response.body.event_triggered).toBe('enter');
    });

    test('should detect geofence exit', async () => {
      const checkRequest = {
        geofence_id: geofenceId,
        location: {
          latitude: 25.280000, // Outside geofence
          longitude: 55.300000,
          accuracy: 10
        }
      };

      const response = await request(app.server)
        .post('/api/geofence/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkRequest);

      expect(response.status).toBe(200);
      expect(response.body.inside_geofence).toBe(false);
      expect(response.body.event_triggered).toBe('exit');
    });
  });

  describe('WebSocket Integration', () => {
    test('should broadcast location updates via WebSocket', (done) => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${process.env.API_PORT || 3001}/ws`);

      ws.on('open', async () => {
        // Subscribe to location updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `driver:${driverId}:location`,
          token: authToken
        }));

        // Send location update
        await request(app.server)
          .post('/api/driver/location')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            delivery_id: deliveryId,
            latitude: 25.276987,
            longitude: 55.296249,
            accuracy: 10,
            timestamp: Date.now()
          });
      });

      ws.on('message', (data: string) => {
        const message = JSON.parse(data);
        
        if (message.type === 'location_update') {
          expect(message.driver_id).toBe(driverId);
          expect(message.location).toBeDefined();
          expect(message.location.latitude).toBe(25.276987);
          expect(message.location.longitude).toBe(55.296249);
          
          ws.close();
          done();
        }
      });
    }, 10000);
  });

  describe('Performance Tests', () => {
    test('should handle concurrent location updates', async () => {
      const concurrentUpdates = Array.from({ length: 50 }, (_, i) => ({
        delivery_id: deliveryId,
        latitude: 25.276987 + (Math.random() * 0.01),
        longitude: 55.296249 + (Math.random() * 0.01),
        accuracy: 5 + Math.random() * 10,
        timestamp: Date.now() + i
      }));

      const startTime = Date.now();

      const promises = concurrentUpdates.map(update =>
        request(app.server)
          .post('/api/driver/location')
          .set('Authorization', `Bearer ${authToken}`)
          .send(update)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should optimize large route efficiently', async () => {
      // Create 20 test deliveries
      const deliveryPromises = Array.from({ length: 20 }, (_, i) =>
        request(app.server)
          .post('/api/deliveries')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testUtils.createMockDelivery({
            driver_id: driverId,
            delivery_latitude: 25.0 + (Math.random() * 0.5),
            delivery_longitude: 55.0 + (Math.random() * 0.5)
          }))
      );

      const deliveries = await Promise.all(deliveryPromises);
      const deliveryIds = deliveries.map(d => d.body.delivery.id);

      const startTime = Date.now();

      const response = await request(app.server)
        .post('/api/route/optimize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          delivery_ids: deliveryIds,
          start_location: {
            latitude: 25.276987,
            longitude: 55.296249
          },
          vehicle_type: 'motorcycle',
          algorithm: 'nearest_neighbor'
        });

      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.optimized_route.deliveries).toHaveLength(20);
      
      // Should complete within reasonable time (< 10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test would require mocking database connection failures
      // Implementation depends on your database layer
    });

    test('should validate authentication tokens properly', async () => {
      const response = await request(app.server)
        .post('/api/driver/location')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          delivery_id: deliveryId,
          latitude: 25.276987,
          longitude: 55.296249,
          accuracy: 10,
          timestamp: Date.now()
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('invalid token');
    });

    test('should handle malformed request bodies', async () => {
      const response = await request(app.server)
        .post('/api/driver/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid-json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('malformed request');
    });
  });
});