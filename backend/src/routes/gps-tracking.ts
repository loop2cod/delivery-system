// GPS tracking and route optimization backend endpoints
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../config/database';
import { authenticateToken } from '../middleware/auth';
// Temporary direct import until shared module build issues are resolved
import { LocationCoordinate, OptimizedRoute, RouteWaypoint } from '../../shared/src/location-services';

interface LocationUpdateRequest {
  deliveryId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface BatchLocationRequest {
  deliveryId?: string;
  locations: LocationCoordinate[];
  metadata?: Record<string, any>;
}

interface RouteOptimizationRequest {
  deliveryIds: string[];
  startLocation?: LocationCoordinate;
  vehicleType?: 'car' | 'motorcycle' | 'bicycle' | 'walking';
  optimizationType?: 'time' | 'distance' | 'priority';
  maxStops?: number;
}

interface GeofenceRequest {
  deliveryId: string;
  latitude: number;
  longitude: number;
  radius: number;
  type: 'pickup' | 'delivery' | 'hub' | 'restricted';
  metadata?: Record<string, any>;
}

export async function gpsTrackingRoutes(fastify: FastifyInstance) {
  
  // Update driver location
  fastify.post<{ Body: LocationUpdateRequest }>('/gps/driver/location', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['latitude', 'longitude', 'timestamp'],
        properties: {
          deliveryId: { type: 'string' },
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          accuracy: { type: 'number', minimum: 0 },
          altitude: { type: 'number' },
          altitudeAccuracy: { type: 'number', minimum: 0 },
          heading: { type: 'number', minimum: 0, maximum: 360 },
          speed: { type: 'number', minimum: 0 },
          timestamp: { type: 'number' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: LocationUpdateRequest }>, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const locationData = request.body;

      // Validate driver role
      if (user.role !== 'driver') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only drivers can update location'
        });
      }

      // Store location update
      const locationId = await storeLocationUpdate(user.id, locationData);

      // Update driver's current location
      await updateDriverCurrentLocation(user.id, locationData);

      // If delivery ID provided, update delivery tracking
      if (locationData.deliveryId) {
        await updateDeliveryLocation(locationData.deliveryId, user.id, locationData);
        
        // Check geofences
        await checkGeofences(locationData.deliveryId, locationData);
      }

      // Broadcast location update via WebSocket
      await broadcastLocationUpdate(user.id, locationData);

      reply.send({
        success: true,
        locationId,
        timestamp: Date.now(),
        message: 'Location updated successfully'
      });
    } catch (error) {
      console.error('[GPS Tracking] Location update failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update location'
      });
    }
  });

  // Batch location updates
  fastify.post<{ Body: BatchLocationRequest }>('/gps/driver/location/batch', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['locations'],
        properties: {
          deliveryId: { type: 'string' },
          locations: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: {
              type: 'object',
              required: ['latitude', 'longitude', 'timestamp'],
              properties: {
                latitude: { type: 'number', minimum: -90, maximum: 90 },
                longitude: { type: 'number', minimum: -180, maximum: 180 },
                accuracy: { type: 'number', minimum: 0 },
                altitude: { type: 'number' },
                altitudeAccuracy: { type: 'number', minimum: 0 },
                heading: { type: 'number', minimum: 0, maximum: 360 },
                speed: { type: 'number', minimum: 0 },
                timestamp: { type: 'number' }
              }
            }
          },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: BatchLocationRequest }>, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { deliveryId, locations, metadata } = request.body;

      if (user.role !== 'driver') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only drivers can update location'
        });
      }

      // Process batch location updates
      const locationIds = await Promise.all(
        locations.map(location => storeLocationUpdate(user.id, { ...location, deliveryId, metadata }))
      );

      // Update driver's current location with the most recent location
      const latestLocation = locations.reduce((latest, current) => 
        current.timestamp > latest.timestamp ? current : latest
      );
      await updateDriverCurrentLocation(user.id, { ...latestLocation, deliveryId, metadata });

      // If delivery ID provided, update delivery tracking
      if (deliveryId) {
        await updateDeliveryLocation(deliveryId, user.id, { ...latestLocation, deliveryId, metadata });
      }

      reply.send({
        success: true,
        processedCount: locations.length,
        locationIds,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[GPS Tracking] Batch location update failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process batch location updates'
      });
    }
  });

  // Get driver location history
  fastify.get('/driver/:driverId/location/history', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{ Params: { driverId: string }; Querystring: { limit?: number; from?: string; to?: string } }>, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { driverId } = request.params;
      const { limit = 100, from, to } = request.query;

      // Check permissions
      if (user.role !== 'admin' && user.id !== driverId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions to view location history'
        });
      }

      const history = await getLocationHistory(driverId, { limit, from, to });

      reply.send({
        success: true,
        driverId,
        history,
        count: history.length
      });
    } catch (error) {
      console.error('[GPS Tracking] Get location history failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get location history'
      });
    }
  });

  // Route optimization
  fastify.post<{ Body: RouteOptimizationRequest }>('/driver/route/optimize', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['deliveryIds'],
        properties: {
          deliveryIds: {
            type: 'array',
            minItems: 1,
            maxItems: 20,
            items: { type: 'string' }
          },
          startLocation: {
            type: 'object',
            properties: {
              latitude: { type: 'number', minimum: -90, maximum: 90 },
              longitude: { type: 'number', minimum: -180, maximum: 180 },
              timestamp: { type: 'number' }
            },
            required: ['latitude', 'longitude', 'timestamp']
          },
          vehicleType: { type: 'string', enum: ['car', 'motorcycle', 'bicycle', 'walking'] },
          optimizationType: { type: 'string', enum: ['time', 'distance', 'priority'] },
          maxStops: { type: 'number', minimum: 1, maximum: 20 }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: RouteOptimizationRequest }>, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { deliveryIds, startLocation, vehicleType = 'car', optimizationType = 'time', maxStops = 10 } = request.body;

      // Validate driver permissions
      if (user.role !== 'driver') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only drivers can optimize routes'
        });
      }

      // Get delivery details
      const deliveries = await getDeliveriesForOptimization(deliveryIds, user.id);
      
      if (deliveries.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'No valid deliveries found for optimization'
        });
      }

      // Optimize route
      const optimizedRoute = await optimizeDeliveryRoute(
        deliveries,
        startLocation,
        { vehicleType, optimizationType, maxStops }
      );

      // Store optimized route
      const routeId = await storeOptimizedRoute(user.id, optimizedRoute);

      reply.send({
        success: true,
        routeId,
        route: optimizedRoute,
        optimizedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[GPS Tracking] Route optimization failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to optimize route'
      });
    }
  });

  // Get optimized route
  fastify.get('/driver/route/:routeId', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{ Params: { routeId: string } }>, reply: FastifyReply) => {
    try {
      const { routeId } = request.params;
      const user = request.user as any;

      const route = await getStoredRoute(routeId, user.id);

      if (!route) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Route not found'
        });
      }

      reply.send({
        success: true,
        route
      });
    } catch (error) {
      console.error('[GPS Tracking] Get route failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get route'
      });
    }
  });

  // Create geofence
  fastify.post<{ Body: GeofenceRequest }>('/delivery/:deliveryId/geofence', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['deliveryId', 'latitude', 'longitude', 'radius', 'type'],
        properties: {
          deliveryId: { type: 'string' },
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          radius: { type: 'number', minimum: 1, maximum: 1000 },
          type: { type: 'string', enum: ['pickup', 'delivery', 'hub', 'restricted'] },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { deliveryId: string }; Body: GeofenceRequest }>, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      const { deliveryId } = request.params;
      const geofenceData = request.body;

      // Validate permissions
      if (!await canAccessDelivery(user, deliveryId)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions for this delivery'
        });
      }

      const geofenceId = await createGeofence(deliveryId, geofenceData, user.id);

      reply.send({
        success: true,
        geofenceId,
        message: 'Geofence created successfully'
      });
    } catch (error) {
      console.error('[GPS Tracking] Create geofence failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create geofence'
      });
    }
  });

  // Get tracking analytics
  fastify.get('/admin/tracking/analytics', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;

      if (user.role !== 'admin') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      const analytics = await getTrackingAnalytics();

      reply.send({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('[GPS Tracking] Get analytics failed:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get tracking analytics'
      });
    }
  });
}

// Helper functions
async function storeLocationUpdate(driverId: string, locationData: LocationUpdateRequest): Promise<string> {
  const result = await db.query(`
    INSERT INTO driver_locations (
      driver_id, delivery_id, latitude, longitude, accuracy, altitude, 
      altitude_accuracy, heading, speed, timestamp, metadata, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    RETURNING id
  `, [
    driverId,
    locationData.deliveryId || null,
    locationData.latitude,
    locationData.longitude,
    locationData.accuracy || null,
    locationData.altitude || null,
    locationData.altitudeAccuracy || null,
    locationData.heading || null,
    locationData.speed || null,
    new Date(locationData.timestamp),
    JSON.stringify(locationData.metadata || {})
  ]);

  return result.rows[0].id;
}

async function updateDriverCurrentLocation(driverId: string, locationData: LocationUpdateRequest): Promise<void> {
  await db.query(`
    UPDATE drivers SET 
      current_latitude = $2,
      current_longitude = $3,
      current_accuracy = $4,
      current_heading = $5,
      current_speed = $6,
      location_updated_at = $7
    WHERE id = $1
  `, [
    driverId,
    locationData.latitude,
    locationData.longitude,
    locationData.accuracy || null,
    locationData.heading || null,
    locationData.speed || null,
    new Date(locationData.timestamp)
  ]);
}

async function updateDeliveryLocation(deliveryId: string, driverId: string, locationData: LocationUpdateRequest): Promise<void> {
  await db.query(`
    UPDATE deliveries SET 
      current_latitude = $3,
      current_longitude = $4,
      location_updated_at = $5
    WHERE id = $1 AND driver_id = $2
  `, [
    deliveryId,
    driverId,
    locationData.latitude,
    locationData.longitude,
    new Date(locationData.timestamp)
  ]);
}

async function checkGeofences(deliveryId: string, location: LocationUpdateRequest): Promise<void> {
  // Get active geofences for delivery
  const geofences = await db.query(`
    SELECT * FROM geofences 
    WHERE delivery_id = $1 AND is_active = true
  `, [deliveryId]);

  for (const geofence of geofences.rows) {
    const distance = calculateDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: geofence.latitude, longitude: geofence.longitude }
    );

    if (distance <= geofence.radius) {
      // Driver entered geofence
      await logGeofenceEvent(deliveryId, geofence.id, 'enter', location);
    }
  }
}

async function broadcastLocationUpdate(driverId: string, locationData: LocationUpdateRequest): Promise<void> {
  // Implementation would depend on your WebSocket setup
  // This is a placeholder for WebSocket broadcasting
  console.log(`[GPS Tracking] Broadcasting location update for driver ${driverId}`);
}

async function getLocationHistory(driverId: string, options: { limit: number; from?: string; to?: string }): Promise<any[]> {
  let query = `
    SELECT * FROM driver_locations 
    WHERE driver_id = $1
  `;
  const params: any[] = [driverId];

  if (options.from) {
    query += ` AND timestamp >= $${params.length + 1}`;
    params.push(options.from);
  }

  if (options.to) {
    query += ` AND timestamp <= $${params.length + 1}`;
    params.push(options.to);
  }

  query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
  params.push(options.limit);

  const result = await db.query(query, params);
  return result.rows;
}

async function getDeliveriesForOptimization(deliveryIds: string[], driverId: string): Promise<any[]> {
  const result = await db.query(`
    SELECT * FROM deliveries 
    WHERE id = ANY($1) AND driver_id = $2
    AND status IN ('assigned', 'confirmed', 'picked_up')
  `, [deliveryIds, driverId]);

  return result.rows;
}

async function optimizeDeliveryRoute(
  deliveries: any[], 
  startLocation?: LocationCoordinate,
  options: { vehicleType: string; optimizationType: string; maxStops: number } = { vehicleType: 'car', optimizationType: 'time', maxStops: 10 }
): Promise<OptimizedRoute> {
  // This is a simplified implementation
  // In a real application, you'd use a more sophisticated routing algorithm
  
  const waypoints: RouteWaypoint[] = deliveries.map(delivery => ({
    coordinate: {
      latitude: delivery.delivery_latitude,
      longitude: delivery.delivery_longitude,
      timestamp: Date.now()
    },
    address: delivery.delivery_address,
    description: `${delivery.service_type} - ${delivery.customer_name}`,
    deliveryId: delivery.id,
    estimatedDuration: getEstimatedDeliveryDuration(delivery.service_type)
  }));

  // Simple nearest neighbor optimization
  const optimizedWaypoints = nearestNeighborOptimization(waypoints, startLocation);
  
  // Calculate route segments
  const segments = calculateRouteSegments(optimizedWaypoints, startLocation);
  const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
  const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);

  return {
    id: `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    waypoints: optimizedWaypoints,
    segments,
    totalDistance,
    totalDuration,
    optimizationScore: calculateOptimizationScore(totalDistance, totalDuration, waypoints.length),
    createdAt: Date.now(),
    vehicleType: options.vehicleType as any
  };
}

function nearestNeighborOptimization(waypoints: RouteWaypoint[], startLocation?: LocationCoordinate): RouteWaypoint[] {
  if (!startLocation) {
    return waypoints; // Return original order if no start location
  }

  const unvisited = [...waypoints];
  const optimized: RouteWaypoint[] = [];
  let currentLocation = startLocation;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(currentLocation, unvisited[0].coordinate);

    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(currentLocation, unvisited[i].coordinate);
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

function calculateRouteSegments(waypoints: RouteWaypoint[], startLocation?: LocationCoordinate): any[] {
  const segments = [];
  let currentLocation = startLocation || waypoints[0]?.coordinate;

  for (const waypoint of waypoints) {
    if (currentLocation) {
      const distance = calculateDistance(currentLocation, waypoint.coordinate);
      const duration = estimateTravelTime(distance);
      
      segments.push({
        start: currentLocation,
        end: waypoint.coordinate,
        distance,
        duration,
        instructions: [`Travel ${Math.round(distance)}m to ${waypoint.description}`]
      });
      
      currentLocation = waypoint.coordinate;
    }
  }

  return segments;
}

function calculateDistance(coord1: { latitude: number; longitude: number }, coord2: { latitude: number; longitude: number }): number {
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

function estimateTravelTime(distance: number, avgSpeed: number = 40): number {
  // avgSpeed in km/h, distance in meters
  return (distance / 1000) / avgSpeed * 3600; // seconds
}

function calculateOptimizationScore(distance: number, duration: number, waypointCount: number): number {
  return (distance / 1000) + (duration / 60) + (waypointCount * 2);
}

function getEstimatedDeliveryDuration(serviceType: string): number {
  const durations: Record<string, number> = {
    'express': 300,
    'same_day': 600,
    'next_day': 900,
    'standard': 600
  };
  return durations[serviceType] || 600;
}

async function storeOptimizedRoute(driverId: string, route: OptimizedRoute): Promise<string> {
  const result = await db.query(`
    INSERT INTO optimized_routes (
      driver_id, route_data, waypoint_count, total_distance, 
      total_duration, optimization_score, vehicle_type, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id
  `, [
    driverId,
    JSON.stringify(route),
    route.waypoints.length,
    route.totalDistance,
    route.totalDuration,
    route.optimizationScore,
    route.vehicleType
  ]);

  return result.rows[0].id;
}

async function getStoredRoute(routeId: string, driverId: string): Promise<OptimizedRoute | null> {
  const result = await db.query(`
    SELECT route_data FROM optimized_routes 
    WHERE id = $1 AND driver_id = $2
  `, [routeId, driverId]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].route_data;
}

async function canAccessDelivery(user: any, deliveryId: string): Promise<boolean> {
  if (user.role === 'admin') return true;
  
  if (user.role === 'driver') {
    const result = await db.query(`
      SELECT id FROM deliveries WHERE id = $1 AND driver_id = $2
    `, [deliveryId, user.id]);
    return result.rows.length > 0;
  }

  return false;
}

async function createGeofence(deliveryId: string, geofenceData: GeofenceRequest, userId: string): Promise<string> {
  const result = await db.query(`
    INSERT INTO geofences (
      delivery_id, latitude, longitude, radius, type, metadata, 
      created_by, is_active, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
    RETURNING id
  `, [
    deliveryId,
    geofenceData.latitude,
    geofenceData.longitude,
    geofenceData.radius,
    geofenceData.type,
    JSON.stringify(geofenceData.metadata || {}),
    userId
  ]);

  return result.rows[0].id;
}

async function logGeofenceEvent(deliveryId: string, geofenceId: string, eventType: string, location: LocationUpdateRequest): Promise<void> {
  await db.query(`
    INSERT INTO geofence_events (
      delivery_id, geofence_id, event_type, latitude, longitude, 
      timestamp, metadata, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
  `, [
    deliveryId,
    geofenceId,
    eventType,
    location.latitude,
    location.longitude,
    new Date(location.timestamp),
    JSON.stringify(location.metadata || {})
  ]);
}

async function getTrackingAnalytics(): Promise<any> {
  const [
    driverStats,
    locationStats,
    routeStats,
    geofenceStats
  ] = await Promise.all([
    db.query(`
      SELECT 
        COUNT(DISTINCT d.id) as active_drivers,
        COUNT(DISTINCT CASE WHEN d.location_updated_at > NOW() - INTERVAL '10 minutes' THEN d.id END) as online_drivers,
        AVG(EXTRACT(EPOCH FROM (NOW() - d.location_updated_at))) as avg_last_update_seconds
      FROM drivers d
    `),
    db.query(`
      SELECT 
        COUNT(*) as total_locations,
        COUNT(DISTINCT driver_id) as tracked_drivers,
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as hourly_updates
      FROM driver_locations 
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour DESC
    `),
    db.query(`
      SELECT 
        COUNT(*) as total_routes,
        AVG(total_distance) as avg_distance,
        AVG(total_duration) as avg_duration,
        AVG(optimization_score) as avg_score
      FROM optimized_routes 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `),
    db.query(`
      SELECT 
        COUNT(*) as total_geofences,
        COUNT(DISTINCT delivery_id) as deliveries_with_geofences,
        type,
        COUNT(*) as count_by_type
      FROM geofences 
      WHERE is_active = true
      GROUP BY type
    `)
  ]);

  return {
    drivers: driverStats.rows[0],
    locations: {
      summary: locationStats.rows[0] || {},
      hourlyUpdates: locationStats.rows
    },
    routes: routeStats.rows[0],
    geofences: {
      summary: geofenceStats.rows[0] || {},
      byType: geofenceStats.rows
    },
    timestamp: new Date().toISOString()
  };
}

export default gpsTrackingRoutes;