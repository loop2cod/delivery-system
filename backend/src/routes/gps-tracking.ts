// GPS tracking and route optimization backend endpoints
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../config/database';
import { authenticateToken } from '../middleware/auth';
// Define types locally until shared module is available
interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

interface RouteWaypoint extends LocationCoordinate {
  id: string;
  address?: string;
}

interface OptimizedRoute {
  waypoints: RouteWaypoint[];
  totalDistance: number;
  estimatedTime: number;
}

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
      const user = request.currentUser as any;
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
      const user = request.currentUser as any;
      const { deliveryId, locations, metadata } = request.body;

      if (user.role !== 'driver') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only drivers can update location'
        });
      }

      // Process batch location updates
      const timestamp = Date.now();
      const locationIds = await Promise.all(
        locations.map(location => storeLocationUpdate(user.id, { ...location, deliveryId, metadata, timestamp }))
      );

      // Update driver's current location with the most recent location
      const latestLocation = locations[locations.length - 1]; // Use last location in array
      await updateDriverCurrentLocation(user.id, { ...latestLocation, deliveryId, metadata, timestamp });

      // If delivery ID provided, update delivery tracking
      if (deliveryId) {
        await updateDeliveryLocation(deliveryId, user.id, { ...latestLocation, deliveryId, metadata, timestamp });
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
      const user = request.currentUser as any;
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
      const user = request.currentUser as any;
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
      const user = request.currentUser as any;

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
      const user = request.currentUser as any;
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
      const user = request.currentUser as any;

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
  const result = await db.insertOne('driver_locations', {
    driver_id: driverId,
    delivery_id: locationData.deliveryId || null,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    accuracy: locationData.accuracy || null,
    altitude: locationData.altitude || null,
    altitude_accuracy: locationData.altitudeAccuracy || null,
    heading: locationData.heading || null,
    speed: locationData.speed || null,
    timestamp: new Date(locationData.timestamp),
    metadata: JSON.stringify(locationData.metadata || {}),
    created_at: new Date()
  } as any);

  return result._id.toString();
}

async function updateDriverCurrentLocation(driverId: string, locationData: LocationUpdateRequest): Promise<void> {
  await db.updateOne('drivers', 
    { id: driverId },
    {
      $set: {
        current_latitude: locationData.latitude,
        current_longitude: locationData.longitude,
        current_accuracy: locationData.accuracy || null,
        current_heading: locationData.heading || null,
        current_speed: locationData.speed || null,
        location_updated_at: new Date(locationData.timestamp)
      }
    }
  );
}

async function updateDeliveryLocation(deliveryId: string, driverId: string, locationData: LocationUpdateRequest): Promise<void> {
  await db.updateOne('deliveries',
    { id: deliveryId, driver_id: driverId },
    {
      $set: {
        current_latitude: locationData.latitude,
        current_longitude: locationData.longitude,
        location_updated_at: new Date(locationData.timestamp)
      }
    }
  );
}

async function checkGeofences(deliveryId: string, location: LocationUpdateRequest): Promise<void> {
  // Get active geofences for delivery
  const geofences = await db.findMany('geofences', {
    delivery_id: deliveryId,
    is_active: true
  });

  for (const geofence of geofences) {
    const distance = calculateDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: (geofence as any).latitude, longitude: (geofence as any).longitude }
    );

    if (distance <= (geofence as any).radius) {
      // Driver entered geofence
      await logGeofenceEvent(deliveryId, (geofence as any).id, 'enter', location);
    }
  }
}

async function broadcastLocationUpdate(driverId: string, locationData: LocationUpdateRequest): Promise<void> {
  // Implementation would depend on your WebSocket setup
  // This is a placeholder for WebSocket broadcasting
  console.log(`[GPS Tracking] Broadcasting location update for driver ${driverId}`);
}

async function getLocationHistory(driverId: string, options: { limit: number; from?: string; to?: string }): Promise<any[]> {
  const filter: any = { driver_id: driverId };
  
  if (options.from || options.to) {
    filter.timestamp = {};
    if (options.from) filter.timestamp.$gte = new Date(options.from);
    if (options.to) filter.timestamp.$lte = new Date(options.to);
  }

  return await db.findMany('driver_locations', filter, {
    sort: { timestamp: -1 },
    limit: options.limit
  });
}

async function getDeliveriesForOptimization(deliveryIds: string[], driverId: string): Promise<any[]> {
  return await db.findMany('deliveries', {
    id: { $in: deliveryIds },
    driver_id: driverId,
    status: { $in: ['assigned', 'confirmed', 'picked_up'] }
  });
}

async function optimizeDeliveryRoute(
  deliveries: any[], 
  startLocation?: LocationCoordinate,
  options: { vehicleType: string; optimizationType: string; maxStops: number } = { vehicleType: 'car', optimizationType: 'time', maxStops: 10 }
): Promise<OptimizedRoute> {
  // This is a simplified implementation
  // In a real application, you'd use a more sophisticated routing algorithm
  
  const waypoints: RouteWaypoint[] = deliveries.map(delivery => ({
    id: (delivery as any).id,
    latitude: (delivery as any).delivery_latitude,
    longitude: (delivery as any).delivery_longitude,
    address: (delivery as any).delivery_address
  }));

  // Simple nearest neighbor optimization
  const optimizedWaypoints = nearestNeighborOptimization(waypoints, startLocation);
  
  // Calculate route segments
  const segments = calculateRouteSegments(optimizedWaypoints, startLocation);
  const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
  const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);

  return {
    waypoints: optimizedWaypoints,
    totalDistance,
    estimatedTime: totalDuration
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
    let nearestDistance = calculateDistance(currentLocation, {
      latitude: unvisited[0].latitude,
      longitude: unvisited[0].longitude
    });

    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(currentLocation, {
        latitude: unvisited[i].latitude,
        longitude: unvisited[i].longitude
      });
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const nearest = unvisited.splice(nearestIndex, 1)[0];
    optimized.push(nearest);
    currentLocation = { latitude: nearest.latitude, longitude: nearest.longitude };
  }

  return optimized;
}

function calculateRouteSegments(waypoints: RouteWaypoint[], startLocation?: LocationCoordinate): any[] {
  const segments = [];
  let currentLocation = startLocation || (waypoints[0] ? {
    latitude: waypoints[0].latitude,
    longitude: waypoints[0].longitude
  } : null);

  for (const waypoint of waypoints) {
    if (currentLocation) {
      const waypointLocation = {
        latitude: waypoint.latitude,
        longitude: waypoint.longitude
      };
      const distance = calculateDistance(currentLocation, waypointLocation);
      const duration = estimateTravelTime(distance);
      
      segments.push({
        start: currentLocation,
        end: waypointLocation,
        distance,
        duration,
        instructions: [`Travel ${Math.round(distance)}m to ${waypoint.address || waypoint.id}`]
      });
      
      currentLocation = waypointLocation;
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
  const result = await db.insertOne('optimized_routes', {
    driver_id: driverId,
    route_data: JSON.stringify(route),
    waypoint_count: route.waypoints.length,
    total_distance: route.totalDistance,
    total_duration: route.estimatedTime,
    optimization_score: 0,
    vehicle_type: 'car',
    created_at: new Date()
  } as any);

  return result._id.toString();
}

async function getStoredRoute(routeId: string, driverId: string): Promise<OptimizedRoute | null> {
  const result = await db.findOne('optimized_routes', {
    id: routeId,
    driver_id: driverId
  });

  if (!result) {
    return null;
  }

  return (result as any).route_data;
}

async function canAccessDelivery(user: any, deliveryId: string): Promise<boolean> {
  if (user.role === 'admin') return true;
  
  if (user.role === 'driver') {
    const result = await db.findOne('deliveries', {
      id: deliveryId,
      driver_id: user.id
    });
    return !!result;
  }

  return false;
}

async function createGeofence(deliveryId: string, geofenceData: GeofenceRequest, userId: string): Promise<string> {
  const result = await db.insertOne('geofences', {
    delivery_id: deliveryId,
    latitude: geofenceData.latitude,
    longitude: geofenceData.longitude,
    radius: geofenceData.radius,
    type: geofenceData.type,
    metadata: JSON.stringify(geofenceData.metadata || {}),
    created_by: userId,
    is_active: true,
    created_at: new Date()
  } as any);

  return result._id.toString();
}

async function logGeofenceEvent(deliveryId: string, geofenceId: string, eventType: string, location: LocationUpdateRequest): Promise<void> {
  await db.insertOne('geofence_events', {
    delivery_id: deliveryId,
    geofence_id: geofenceId,
    event_type: eventType,
    latitude: location.latitude,
    longitude: location.longitude,
    timestamp: new Date(location.timestamp),
    metadata: JSON.stringify(location.metadata || {}),
    created_at: new Date()
  } as any);
}

async function getTrackingAnalytics(): Promise<any> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const [
      drivers,
      locations,
      routes,
      geofences
    ] = await Promise.all([
      db.findMany('drivers', {}),
      db.findMany('driver_locations', {
        timestamp: { $gt: twentyFourHoursAgo }
      }),
      db.findMany('optimized_routes', {
        created_at: { $gt: sevenDaysAgo }
      }),
      db.findMany('geofences', {
        is_active: true
      })
    ]);

    const onlineDrivers = drivers.filter(d => 
      (d as any).location_updated_at && new Date((d as any).location_updated_at) > tenMinutesAgo
    ).length;

    return {
      drivers: {
        active_drivers: drivers.length,
        online_drivers: onlineDrivers,
        avg_last_update_seconds: 0 // Simplified for now
      },
      locations: {
        summary: {
          total_locations: locations.length,
          tracked_drivers: new Set(locations.map(l => (l as any).driver_id)).size
        },
        hourlyUpdates: [] // Simplified for now
      },
      routes: {
        total_routes: routes.length,
        avg_distance: routes.reduce((sum, r) => sum + ((r as any).total_distance || 0), 0) / (routes.length || 1),
        avg_duration: routes.reduce((sum, r) => sum + ((r as any).total_duration || 0), 0) / (routes.length || 1)
      },
      geofences: {
        summary: {
          total_geofences: geofences.length,
          deliveries_with_geofences: new Set(geofences.map(g => (g as any).delivery_id)).size
        },
        byType: [] // Simplified for now
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[GPS Tracking] Get tracking analytics failed:', error);
    return {
      drivers: { active_drivers: 0, online_drivers: 0, avg_last_update_seconds: 0 },
      locations: { summary: {}, hourlyUpdates: [] },
      routes: { total_routes: 0, avg_distance: 0, avg_duration: 0 },
      geofences: { summary: {}, byType: [] },
      timestamp: new Date().toISOString()
    };
  }
}

export default gpsTrackingRoutes;