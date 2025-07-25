-- UAE Delivery Management System Database Schema
-- PostgreSQL Database Schema with full support for PWA requirements

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enum types
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'DRIVER', 'BUSINESS', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');
CREATE TYPE company_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL');
CREATE TYPE account_type AS ENUM ('BASIC', 'PREMIUM', 'ENTERPRISE');
CREATE TYPE emirate AS ENUM ('DUBAI', 'ABU_DHABI', 'SHARJAH', 'AJMAN', 'RAS_AL_KHAIMAH', 'FUJAIRAH', 'UMM_AL_QUWAIN');
CREATE TYPE package_type AS ENUM ('DOCUMENTS', 'PARCELS', 'FRAGILE', 'ELECTRONICS', 'CLOTHING', 'FOOD', 'OTHER');
CREATE TYPE package_status AS ENUM ('CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'RETURNED', 'CANCELLED');
CREATE TYPE request_status AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE vehicle_type AS ENUM ('MOTORCYCLE', 'SEDAN', 'VAN', 'TRUCK');
CREATE TYPE driver_status AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE', 'ON_BREAK');
CREATE TYPE inquiry_status AS ENUM ('NEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED');
CREATE TYPE notification_type AS ENUM ('PACKAGE_PICKED_UP', 'PACKAGE_IN_TRANSIT', 'PACKAGE_DELIVERED', 'DELIVERY_FAILED', 'NEW_ASSIGNMENT', 'INQUIRY_RECEIVED', 'ACCOUNT_APPROVED');

-- Users table - stores all system users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    status user_status NOT NULL DEFAULT 'PENDING',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Companies table - business customers
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_license VARCHAR(50) UNIQUE NOT NULL,
    industry VARCHAR(100) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status company_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    account_type account_type NOT NULL DEFAULT 'BASIC',
    credit_terms INTEGER DEFAULT 30,
    monthly_volume_estimate INTEGER DEFAULT 0,
    
    -- Address information
    street_address TEXT NOT NULL,
    area VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    emirate emirate NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United Arab Emirates',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company users relationship
CREATE TABLE company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, user_id)
);

-- Drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type vehicle_type NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    vehicle_color VARCHAR(50),
    vehicle_model VARCHAR(100),
    status driver_status NOT NULL DEFAULT 'OFFLINE',
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Current location
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    location_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Specializations
    specializations package_type[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inquiries table - customer inquiries from public PWA
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    expected_volume VARCHAR(100) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    special_requirements TEXT,
    status inquiry_status NOT NULL DEFAULT 'NEW',
    assigned_staff_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Delivery requests table
CREATE TABLE delivery_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(30) UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    
    -- Pickup details
    pickup_contact_name VARCHAR(255) NOT NULL,
    pickup_contact_phone VARCHAR(20) NOT NULL,
    pickup_street_address TEXT NOT NULL,
    pickup_area VARCHAR(100) NOT NULL,
    pickup_city VARCHAR(100) NOT NULL,
    pickup_emirate emirate NOT NULL,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    pickup_instructions TEXT,
    preferred_pickup_time TIMESTAMP WITH TIME ZONE,
    
    -- Request details
    total_packages INTEGER NOT NULL DEFAULT 0,
    total_weight DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    total_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    status request_status NOT NULL DEFAULT 'PENDING',
    assigned_driver_id UUID REFERENCES drivers(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Packages table
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
    package_code VARCHAR(20) UNIQUE NOT NULL,
    qr_code TEXT NOT NULL,
    
    -- Recipient details
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    delivery_street_address TEXT NOT NULL,
    delivery_area VARCHAR(100) NOT NULL,
    delivery_city VARCHAR(100) NOT NULL,
    delivery_emirate emirate NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    
    -- Package details
    package_type package_type NOT NULL,
    weight DECIMAL(8, 2) NOT NULL,
    length_cm DECIMAL(8, 2),
    width_cm DECIMAL(8, 2),
    height_cm DECIMAL(8, 2),
    value DECIMAL(10, 2) NOT NULL,
    special_instructions TEXT,
    
    -- Delivery details
    status package_status NOT NULL DEFAULT 'CREATED',
    delivery_fee DECIMAL(8, 2) NOT NULL,
    insurance_fee DECIMAL(8, 2) DEFAULT 0.00,
    
    -- Proof of delivery
    delivered_at TIMESTAMP WITH TIME ZONE,
    delivered_to VARCHAR(255),
    delivery_photo_urls TEXT[],
    signature_image_url TEXT,
    delivery_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Package timeline - tracks all status changes
CREATE TABLE package_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    status package_status NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Location information
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(255),
    
    -- Additional information
    notes TEXT,
    driver_id UUID REFERENCES drivers(id),
    photo_urls TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Driver locations - GPS tracking history
CREATE TABLE driver_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    heading DECIMAL(5, 2),
    speed DECIMAL(5, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    
    -- Delivery status
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- PWA push notification
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews and ratings
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES packages(id),
    reviewer_user_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(package_id, reviewer_user_id)
);

-- App settings and configuration
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PWA offline sync queue
CREATE TABLE offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    pwa_type VARCHAR(20) NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for PWA authentication
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    pwa_type VARCHAR(20) NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_emirate ON companies(emirate);
CREATE INDEX idx_companies_trade_license ON companies(trade_license);

CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_location ON drivers(current_latitude, current_longitude);

CREATE INDEX idx_delivery_requests_company_id ON delivery_requests(company_id);
CREATE INDEX idx_delivery_requests_status ON delivery_requests(status);
CREATE INDEX idx_delivery_requests_assigned_driver ON delivery_requests(assigned_driver_id);
CREATE INDEX idx_delivery_requests_created_at ON delivery_requests(created_at);

CREATE INDEX idx_packages_request_id ON packages(request_id);
CREATE INDEX idx_packages_code ON packages(package_code);
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_packages_delivery_emirate ON packages(delivery_emirate);

CREATE INDEX idx_package_timeline_package_id ON package_timeline(package_id);
CREATE INDEX idx_package_timeline_status ON package_timeline(status);
CREATE INDEX idx_package_timeline_timestamp ON package_timeline(timestamp);

CREATE INDEX idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX idx_driver_locations_timestamp ON driver_locations(timestamp);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_sent ON notifications(sent);
CREATE INDEX idx_notifications_read ON notifications(read);

CREATE INDEX idx_reviews_driver_id ON reviews(driver_id);
CREATE INDEX idx_reviews_package_id ON reviews(package_id);

CREATE INDEX idx_offline_sync_user_id ON offline_sync_queue(user_id);
CREATE INDEX idx_offline_sync_processed ON offline_sync_queue(processed);
CREATE INDEX idx_offline_sync_pwa_type ON offline_sync_queue(pwa_type);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Functions for automated tasks
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_requests_updated_at BEFORE UPDATE ON delivery_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate package codes
CREATE OR REPLACE FUNCTION generate_package_code(from_emirate emirate, to_emirate emirate)
RETURNS VARCHAR(20) AS $$
DECLARE
    from_code VARCHAR(3);
    to_code VARCHAR(3);
    timestamp_part VARCHAR(6);
    random_part VARCHAR(3);
    package_code VARCHAR(20);
BEGIN
    -- Map emirates to codes
    CASE from_emirate
        WHEN 'DUBAI' THEN from_code := 'DXB';
        WHEN 'ABU_DHABI' THEN from_code := 'AUH';
        WHEN 'SHARJAH' THEN from_code := 'SHJ';
        WHEN 'AJMAN' THEN from_code := 'AJM';
        WHEN 'RAS_AL_KHAIMAH' THEN from_code := 'RAK';
        WHEN 'FUJAIRAH' THEN from_code := 'FJR';
        WHEN 'UMM_AL_QUWAIN' THEN from_code := 'UAQ';
    END CASE;
    
    CASE to_emirate
        WHEN 'DUBAI' THEN to_code := 'DXB';
        WHEN 'ABU_DHABI' THEN to_code := 'AUH';
        WHEN 'SHARJAH' THEN to_code := 'SHJ';
        WHEN 'AJMAN' THEN to_code := 'AJM';
        WHEN 'RAS_AL_KHAIMAH' THEN to_code := 'RAK';
        WHEN 'FUJAIRAH' THEN to_code := 'FJR';
        WHEN 'UMM_AL_QUWAIN' THEN to_code := 'UAQ';
    END CASE;
    
    -- Generate timestamp part (last 6 digits of epoch)
    timestamp_part := RIGHT(EXTRACT(EPOCH FROM NOW())::TEXT, 6);
    
    -- Generate random part (3 digits)
    random_part := LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
    
    -- Combine parts
    package_code := from_code || '2' || to_code || timestamp_part || random_part;
    
    RETURN package_code;
END;
$$ LANGUAGE plpgsql;

-- Initial app settings
INSERT INTO app_settings (key, value, description) VALUES
('pricing_base_rates', '{"same_emirate": 15, "different_emirate": 25, "express": 35}', 'Base delivery rates per kg in AED'),
('package_type_multipliers', '{"DOCUMENTS": 1.2, "PARCELS": 1.0, "FRAGILE": 1.5, "ELECTRONICS": 1.3, "CLOTHING": 1.0, "FOOD": 1.4, "OTHER": 1.1}', 'Package type pricing multipliers'),
('volume_discounts', '{"50": 0.1, "100": 0.15, "200": 0.2}', 'Volume discount rates'),
('business_hours', '{"start": "08:00", "end": "18:00", "timezone": "Asia/Dubai"}', 'Standard business hours'),
('max_delivery_distance', '500', 'Maximum delivery distance in kilometers'),
('insurance_rate', '0.001', 'Insurance rate as percentage of package value'),
('min_delivery_charge', '10', 'Minimum delivery charge in AED');

-- Create default admin user (password should be changed in production)
INSERT INTO users (email, password_hash, name, phone, role, status, email_verified) VALUES
('admin@deliveryuae.com', '$2a$10$example.hash.here', 'System Administrator', '+971501234567', 'SUPER_ADMIN', 'ACTIVE', TRUE);

COMMENT ON DATABASE postgres IS 'UAE Delivery Management System - PWA Database Schema v1.0.0';