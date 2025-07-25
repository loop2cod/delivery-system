-- GPS tracking and route optimization database schema

-- Driver location tracking table
CREATE TABLE IF NOT EXISTS driver_locations (
    id SERIAL PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES users(id),
    delivery_id UUID REFERENCES deliveries(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2), -- GPS accuracy in meters
    altitude DECIMAL(8, 2), -- Altitude in meters
    altitude_accuracy DECIMAL(8, 2), -- Altitude accuracy in meters
    heading DECIMAL(5, 2), -- Compass heading 0-360 degrees
    speed DECIMAL(8, 2), -- Speed in m/s
    timestamp TIMESTAMP NOT NULL, -- GPS timestamp
    metadata JSONB DEFAULT '{}', -- Additional data (battery, network, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_driver_locations_driver_id (driver_id),
    INDEX idx_driver_locations_delivery_id (delivery_id),
    INDEX idx_driver_locations_timestamp (timestamp),
    INDEX idx_driver_locations_coordinates (latitude, longitude)
);

-- Add current location fields to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_accuracy DECIMAL(8, 2);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_heading DECIMAL(5, 2);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_speed DECIMAL(8, 2);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;

-- Add current location fields to deliveries table  
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;

-- Optimized routes table
CREATE TABLE IF NOT EXISTS optimized_routes (
    id SERIAL PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES users(id),
    route_data JSONB NOT NULL, -- Complete route information
    waypoint_count INTEGER NOT NULL,
    total_distance INTEGER NOT NULL, -- Total distance in meters
    total_duration INTEGER NOT NULL, -- Total duration in seconds
    optimization_score DECIMAL(10, 2) NOT NULL,
    vehicle_type VARCHAR(20) DEFAULT 'car',
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_optimized_routes_driver_id (driver_id),
    INDEX idx_optimized_routes_created_at (created_at),
    INDEX idx_optimized_routes_active (is_active)
);

-- Geofences table for location-based alerts
CREATE TABLE IF NOT EXISTS geofences (
    id SERIAL PRIMARY KEY,
    delivery_id UUID NOT NULL REFERENCES deliveries(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius INTEGER NOT NULL, -- Radius in meters
    type VARCHAR(20) NOT NULL CHECK (type IN ('pickup', 'delivery', 'hub', 'restricted')),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_geofences_delivery_id (delivery_id),
    INDEX idx_geofences_coordinates (latitude, longitude),
    INDEX idx_geofences_type (type),
    INDEX idx_geofences_active (is_active)
);

-- Geofence events table
CREATE TABLE IF NOT EXISTS geofence_events (
    id SERIAL PRIMARY KEY,
    delivery_id UUID NOT NULL REFERENCES deliveries(id),
    geofence_id INTEGER NOT NULL REFERENCES geofences(id),
    driver_id UUID REFERENCES users(id),
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('enter', 'exit', 'dwell')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_geofence_events_delivery_id (delivery_id),
    INDEX idx_geofence_events_geofence_id (geofence_id),
    INDEX idx_geofence_events_driver_id (driver_id),
    INDEX idx_geofence_events_timestamp (timestamp),
    INDEX idx_geofence_events_type (event_type)
);

-- Route waypoints table for detailed route tracking
CREATE TABLE IF NOT EXISTS route_waypoints (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES optimized_routes(id) ON DELETE CASCADE,
    delivery_id UUID REFERENCES deliveries(id),
    sequence_order INTEGER NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    description TEXT,
    estimated_duration INTEGER, -- Seconds
    actual_arrival_time TIMESTAMP,
    actual_departure_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approaching', 'arrived', 'completed', 'skipped')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_route_waypoints_route_id (route_id),
    INDEX idx_route_waypoints_delivery_id (delivery_id),
    INDEX idx_route_waypoints_sequence (route_id, sequence_order),
    INDEX idx_route_waypoints_status (status)
);

-- Create indexes for location queries
CREATE INDEX IF NOT EXISTS idx_drivers_current_location ON drivers(current_latitude, current_longitude) WHERE current_latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deliveries_current_location ON deliveries(current_latitude, current_longitude) WHERE current_latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_driver_locations_recent ON driver_locations(driver_id, timestamp DESC);

-- GPS tracking analytics view
CREATE OR REPLACE VIEW tracking_analytics AS
SELECT 
    d.id as driver_id,
    d.name as driver_name,
    d.current_latitude,
    d.current_longitude,
    d.location_updated_at,
    COUNT(dl.id) as total_location_updates,
    MAX(dl.timestamp) as last_gps_update,
    AVG(dl.accuracy) as avg_accuracy,
    COUNT(DISTINCT dl.delivery_id) as tracked_deliveries,
    COUNT(or_table.id) as optimized_routes_count,
    AVG(or_table.optimization_score) as avg_optimization_score
FROM drivers d
LEFT JOIN driver_locations dl ON d.id = dl.driver_id AND dl.timestamp > NOW() - INTERVAL '24 hours'
LEFT JOIN optimized_routes or_table ON d.id = or_table.driver_id
WHERE d.role = 'driver'
GROUP BY d.id, d.name, d.current_latitude, d.current_longitude, d.location_updated_at;

-- Real-time driver status view
CREATE OR REPLACE VIEW driver_status_realtime AS
SELECT 
    d.id,
    d.name,
    d.current_latitude,
    d.current_longitude,
    d.current_speed,
    d.current_heading,
    d.location_updated_at,
    CASE 
        WHEN d.location_updated_at > NOW() - INTERVAL '5 minutes' THEN 'online'
        WHEN d.location_updated_at > NOW() - INTERVAL '30 minutes' THEN 'idle'
        ELSE 'offline'
    END as status,
    COUNT(CASE WHEN del.status IN ('assigned', 'picked_up', 'in_transit') THEN 1 END) as active_deliveries,
    or_active.id as current_route_id,
    or_active.waypoint_count as route_waypoints
FROM drivers d
LEFT JOIN deliveries del ON d.id = del.driver_id
LEFT JOIN optimized_routes or_active ON d.id = or_active.driver_id AND or_active.is_active = true
WHERE d.role = 'driver'
GROUP BY d.id, d.name, d.current_latitude, d.current_longitude, d.current_speed, 
         d.current_heading, d.location_updated_at, or_active.id, or_active.waypoint_count;

-- Delivery tracking summary view
CREATE OR REPLACE VIEW delivery_tracking_summary AS
SELECT 
    del.id as delivery_id,
    del.tracking_number,
    del.status,
    del.current_latitude,
    del.current_longitude,
    del.location_updated_at,
    d.name as driver_name,
    d.current_latitude as driver_latitude,
    d.current_longitude as driver_longitude,
    CASE 
        WHEN del.current_latitude IS NOT NULL AND del.current_longitude IS NOT NULL 
        THEN ST_Distance(
            ST_Point(del.current_longitude, del.current_latitude)::geography,
            ST_Point(del.delivery_longitude, del.delivery_latitude)::geography
        )
    END as distance_to_destination,
    COUNT(ge.id) as geofence_events,
    MAX(ge.timestamp) as last_geofence_event
FROM deliveries del
LEFT JOIN drivers d ON del.driver_id = d.id
LEFT JOIN geofence_events ge ON del.id = ge.delivery_id
WHERE del.status IN ('assigned', 'picked_up', 'in_transit')
GROUP BY del.id, del.tracking_number, del.status, del.current_latitude, del.current_longitude,
         del.location_updated_at, d.name, d.current_latitude, d.current_longitude,
         del.delivery_longitude, del.delivery_latitude;

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL(10,8), 
    lon1 DECIMAL(11,8), 
    lat2 DECIMAL(10,8), 
    lon2 DECIMAL(11,8)
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    R CONSTANT DECIMAL := 6371000; -- Earth's radius in meters
    rad_lat1 DECIMAL;
    rad_lat2 DECIMAL; 
    delta_lat DECIMAL;
    delta_lon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    rad_lat1 := lat1 * PI() / 180;
    rad_lat2 := lat2 * PI() / 180;
    delta_lat := (lat2 - lat1) * PI() / 180;
    delta_lon := (lon2 - lon1) * PI() / 180;
    
    a := SIN(delta_lat/2) * SIN(delta_lat/2) + 
         COS(rad_lat1) * COS(rad_lat2) * 
         SIN(delta_lon/2) * SIN(delta_lon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update delivery location when driver location changes
CREATE OR REPLACE FUNCTION update_delivery_location_from_driver()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delivery_id IS NOT NULL THEN
        UPDATE deliveries SET 
            current_latitude = NEW.latitude,
            current_longitude = NEW.longitude,
            location_updated_at = NEW.timestamp
        WHERE id = NEW.delivery_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_location
    AFTER INSERT ON driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_location_from_driver();

-- Trigger to check geofences when location is updated
CREATE OR REPLACE FUNCTION check_geofences_on_location_update()
RETURNS TRIGGER AS $$
DECLARE
    geofence_record RECORD;
    distance_to_geofence DECIMAL;
BEGIN
    -- Only check if delivery_id is present
    IF NEW.delivery_id IS NOT NULL THEN
        -- Check all active geofences for this delivery
        FOR geofence_record IN 
            SELECT * FROM geofences 
            WHERE delivery_id = NEW.delivery_id AND is_active = true
        LOOP
            -- Calculate distance to geofence center
            distance_to_geofence := calculate_distance(
                NEW.latitude, NEW.longitude,
                geofence_record.latitude, geofence_record.longitude
            );
            
            -- If within geofence radius, log entry event
            IF distance_to_geofence <= geofence_record.radius THEN
                INSERT INTO geofence_events (
                    delivery_id, geofence_id, driver_id, event_type,
                    latitude, longitude, timestamp, created_at
                ) VALUES (
                    NEW.delivery_id, geofence_record.id, NEW.driver_id, 'enter',
                    NEW.latitude, NEW.longitude, NEW.timestamp, NOW()
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_geofences
    AFTER INSERT ON driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION check_geofences_on_location_update();

-- Clean up old location data (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_location_data()
RETURNS void AS $$
BEGIN
    DELETE FROM driver_locations 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    DELETE FROM geofence_events 
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE driver_locations IS 'GPS tracking data for drivers with high-precision location information';
COMMENT ON TABLE optimized_routes IS 'AI-optimized delivery routes with waypoints and performance metrics';
COMMENT ON TABLE geofences IS 'Geographic boundaries for automated location-based notifications and events';
COMMENT ON TABLE geofence_events IS 'Log of geofence entries, exits, and dwell events';
COMMENT ON TABLE route_waypoints IS 'Individual waypoints within optimized routes with timing data';

COMMENT ON VIEW tracking_analytics IS 'Real-time analytics for GPS tracking performance and driver activity';
COMMENT ON VIEW driver_status_realtime IS 'Current status and location of all active drivers';
COMMENT ON VIEW delivery_tracking_summary IS 'Complete tracking status for active deliveries';

-- Grant appropriate permissions
GRANT SELECT, INSERT ON driver_locations TO backend_user;
GRANT SELECT, INSERT, UPDATE ON optimized_routes TO backend_user;
GRANT SELECT, INSERT, UPDATE ON geofences TO backend_user;
GRANT SELECT, INSERT ON geofence_events TO backend_user;
GRANT SELECT, INSERT, UPDATE ON route_waypoints TO backend_user;

GRANT SELECT ON tracking_analytics TO backend_user;
GRANT SELECT ON driver_status_realtime TO backend_user;
GRANT SELECT ON delivery_tracking_summary TO backend_user;

-- Sample data for testing GPS tracking (optional)
-- INSERT INTO geofences (delivery_id, latitude, longitude, radius, type, created_by) VALUES
-- ((SELECT id FROM deliveries LIMIT 1), 25.276987, 55.296249, 100, 'delivery', (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
-- ((SELECT id FROM deliveries LIMIT 1), 25.197197, 55.274376, 200, 'hub', (SELECT id FROM users WHERE role = 'admin' LIMIT 1));

-- Create scheduled job to clean up old data (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-location-data', '0 2 * * *', 'SELECT cleanup_old_location_data();');