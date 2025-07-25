-- UAE Delivery Management System - Sample Data
-- Development seed data for testing PWAs

-- Sample companies for testing business PWA
INSERT INTO companies (id, name, trade_license, industry, contact_person, phone, email, status, account_type, street_address, area, city, emirate, latitude, longitude) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Al-Manara Trading Company', 'DM-1234567', 'Import/Export', 'Sarah Al-Zahra', '+971501234567', 'sarah@almanara.ae', 'ACTIVE', 'PREMIUM', 'Sheikh Zayed Road', 'Business Bay', 'Dubai', 'DUBAI', 25.2048, 55.2708),
('550e8400-e29b-41d4-a716-446655440002', 'Emirates Tech Solutions', 'SH-2345678', 'Technology', 'Ahmed Hassan', '+971502345678', 'ahmed@emiratestech.ae', 'ACTIVE', 'BASIC', 'Al Corniche Road', 'Al Majaz', 'Sharjah', 'SHARJAH', 25.3463, 55.4209),
('550e8400-e29b-41d4-a716-446655440003', 'Gulf Medical Supplies', 'AH-3456789', 'Healthcare', 'Fatima Al-Mansouri', '+971503456789', 'fatima@gulfmedical.ae', 'ACTIVE', 'ENTERPRISE', 'Khalifa City', 'Khalifa City', 'Abu Dhabi', 'ABU_DHABI', 24.4539, 54.3773);

-- Sample business users
INSERT INTO users (id, email, password_hash, name, phone, role, status, email_verified) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'sarah@almanara.ae', '$2a$10$N9qo8uLOickgx2ZMRZoMye.2pQNFvY8Y8CwvbYvfqT1B3QnK1C4fe', 'Sarah Al-Zahra', '+971501234567', 'BUSINESS', 'ACTIVE', TRUE),
('650e8400-e29b-41d4-a716-446655440002', 'ahmed@emiratestech.ae', '$2a$10$N9qo8uLOickgx2ZMRZoMye.2pQNFvY8Y8CwvbYvfqT1B3QnK1C4fe', 'Ahmed Hassan', '+971502345678', 'BUSINESS', 'ACTIVE', TRUE),
('650e8400-e29b-41d4-a716-446655440003', 'fatima@gulfmedical.ae', '$2a$10$N9qo8uLOickgx2ZMRZoMye.2pQNFvY8Y8CwvbYvfqT1B3QnK1C4fe', 'Fatima Al-Mansouri', '+971503456789', 'BUSINESS', 'ACTIVE', TRUE);

-- Link business users to companies
INSERT INTO company_users (company_id, user_id, is_primary) VALUES
('550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', TRUE),
('550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', TRUE),
('550e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', TRUE);

-- Sample drivers for testing driver PWA
INSERT INTO users (id, email, password_hash, name, phone, role, status, email_verified) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'omar@deliveryuae.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.2pQNFvY8Y8CwvbYvfqT1B3QnK1C4fe', 'Omar Al-Rashid', '+971504567890', 'DRIVER', 'ACTIVE', TRUE),
('750e8400-e29b-41d4-a716-446655440002', 'hassan@deliveryuae.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.2pQNFvY8Y8CwvbYvfqT1B3QnK1C4fe', 'Hassan Mohamed', '+971505678901', 'DRIVER', 'ACTIVE', TRUE),
('750e8400-e29b-41d4-a716-446655440003', 'khalid@deliveryuae.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.2pQNFvY8Y8CwvbYvfqT1B3QnK1C4fe', 'Khalid Ahmed', '+971506789012', 'DRIVER', 'ACTIVE', TRUE);

INSERT INTO drivers (id, user_id, license_number, vehicle_type, vehicle_number, vehicle_color, vehicle_model, status, rating, total_deliveries, specializations, current_latitude, current_longitude, location_updated_at) VALUES
('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'DL123456789', 'SEDAN', 'D-12345', 'White', 'Toyota Camry', 'AVAILABLE', 4.9, 1200, ARRAY['DOCUMENTS', 'FRAGILE']::package_type[], 25.0772, 55.1345, CURRENT_TIMESTAMP),
('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 'DL234567890', 'VAN', 'D-23456', 'Blue', 'Nissan Urvan', 'AVAILABLE', 4.7, 800, ARRAY['PARCELS', 'ELECTRONICS']::package_type[], 25.2048, 55.2708, CURRENT_TIMESTAMP),
('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', 'DL345678901', 'SEDAN', 'D-34567', 'Black', 'Honda Accord', 'AVAILABLE', 5.0, 2000, ARRAY['DOCUMENTS', 'PARCELS', 'CLOTHING']::package_type[], 25.3463, 55.4209, CURRENT_TIMESTAMP);

-- Sample admin users
INSERT INTO users (id, email, password_hash, name, phone, role, status, email_verified) VALUES
('950e8400-e29b-41d4-a716-446655440001', 'admin@deliveryuae.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.2pQNFvY8Y8CwvbYvfqT1B3QnK1C4fe', 'Ahmed Hassan', '+971507890123', 'ADMIN', 'ACTIVE', TRUE),
('950e8400-e29b-41d4-a716-446655440002', 'operations@deliveryuae.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.2pQNFvY8Y8CwvbYvfqT1B3QnK1C4fe', 'Nadia Al-Zahra', '+971508901234', 'ADMIN', 'ACTIVE', TRUE);

-- Sample inquiries for testing public PWA and admin workflow
INSERT INTO inquiries (id, reference_number, company_name, industry, contact_person, email, phone, expected_volume, service_type, special_requirements, status, assigned_staff_id) VALUES
('a50e8400-e29b-41d4-a716-446655440001', 'INQ-2025-0001', 'Future Tech Industries', 'Technology', 'Mohammed Al-Ahmad', 'mohammed@futuretech.ae', '+971509012345', '100+ packages monthly', 'Business-to-business deliveries', 'Temperature controlled items', 'NEW', NULL),
('a50e8400-e29b-41d4-a716-446655440002', 'INQ-2025-0002', 'Golden Sands Restaurant', 'Food & Beverage', 'Amira Hassan', 'amira@goldensands.ae', '+971500123456', '50+ packages monthly', 'Food delivery', 'Hot food delivery within 30 minutes', 'UNDER_REVIEW', '950e8400-e29b-41d4-a716-446655440001');

-- Sample delivery requests for testing
INSERT INTO delivery_requests (id, request_number, company_id, created_by_user_id, pickup_contact_name, pickup_contact_phone, pickup_street_address, pickup_area, pickup_city, pickup_emirate, pickup_latitude, pickup_longitude, pickup_instructions, preferred_pickup_time, total_packages, total_weight, total_value, total_amount, status, assigned_driver_id) VALUES
('b50e8400-e29b-41d4-a716-446655440001', 'REQ-20250124-0001', '550e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'Sarah Al-Zahra', '+971501234567', 'Sheikh Zayed Road, Business Bay', 'Business Bay', 'Dubai', 'DUBAI', 25.2048, 55.2708, 'Reception desk, ask for Sarah', CURRENT_TIMESTAMP + INTERVAL '2 hours', 1, 0.5, 5000.00, 31.50, 'ASSIGNED', '850e8400-e29b-41d4-a716-446655440001'),
('b50e8400-e29b-41d4-a716-446655440002', 'REQ-20250124-0002', '550e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'Ahmed Hassan', '+971502345678', 'Al Corniche Road', 'Al Majaz', 'Sharjah', 'SHARJAH', 25.3463, 55.4209, 'Office building, 3rd floor', CURRENT_TIMESTAMP + INTERVAL '4 hours', 2, 2.5, 1500.00, 75.00, 'PENDING', NULL);

-- Sample packages
INSERT INTO packages (id, request_id, package_code, qr_code, recipient_name, recipient_phone, delivery_street_address, delivery_area, delivery_city, delivery_emirate, delivery_latitude, delivery_longitude, package_type, weight, length_cm, width_cm, height_cm, value, special_instructions, status, delivery_fee, insurance_fee) VALUES
('c50e8400-e29b-41d4-a716-446655440001', 'b50e8400-e29b-41d4-a716-446655440001', 'DXB2AUH001', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=DXB2AUH001', 'Fatima Al-Mansouri', '+971559876543', 'Khalifa City', 'Khalifa City', 'Abu Dhabi', 'ABU_DHABI', 24.4539, 54.3773, 'DOCUMENTS', 0.5, 30.0, 22.0, 1.0, 5000.00, 'Urgent contract documents - handle with care', 'ASSIGNED', 25.00, 5.00),
('c50e8400-e29b-41d4-a716-446655440002', 'b50e8400-e29b-41d4-a716-446655440002', 'SHJ2DXB002', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SHJ2DXB002', 'Ali Al-Mansoori', '+971551234567', 'Downtown Dubai', 'Downtown', 'Dubai', 'DUBAI', 25.1972, 55.2744, 'ELECTRONICS', 1.2, 25.0, 20.0, 15.0, 800.00, 'Laptop - fragile', 'CREATED', 20.00, 3.00),
('c50e8400-e29b-41d4-a716-446655440003', 'b50e8400-e29b-41d4-a716-446655440002', 'SHJ2DXB003', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SHJ2DXB003', 'Mariam Al-Hashemi', '+971552345678', 'Dubai Marina', 'Marina', 'Dubai', 'DUBAI', 25.0772, 55.1345, 'CLOTHING', 1.3, 40.0, 30.0, 10.0, 700.00, 'Designer clothing - handle with care', 'CREATED', 22.00, 2.00);

-- Sample package timeline entries
INSERT INTO package_timeline (package_id, status, timestamp, latitude, longitude, location_name, notes, driver_id) VALUES
('c50e8400-e29b-41d4-a716-446655440001', 'CREATED', CURRENT_TIMESTAMP - INTERVAL '2 hours', 25.2048, 55.2708, 'Al-Manara Trading Company', 'Package created and QR code generated', NULL),
('c50e8400-e29b-41d4-a716-446655440001', 'ASSIGNED', CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes', 25.2048, 55.2708, 'Al-Manara Trading Company', 'Assigned to Omar Al-Rashid', '850e8400-e29b-41d4-a716-446655440001'),
('c50e8400-e29b-41d4-a716-446655440001', 'PICKED_UP', CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes', 25.2048, 55.2708, 'Al-Manara Trading Company', 'Package picked up by Omar', '850e8400-e29b-41d4-a716-446655440001'),
('c50e8400-e29b-41d4-a716-446655440001', 'IN_TRANSIT', CURRENT_TIMESTAMP - INTERVAL '1 hour', 25.1000, 55.0000, 'Dubai-Abu Dhabi Highway', 'In transit to Abu Dhabi', '850e8400-e29b-41d4-a716-446655440001');

-- Sample notifications for testing push notifications
INSERT INTO notifications (user_id, type, title, body, data, sent, push_sent) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'PACKAGE_PICKED_UP', 'Package Picked Up', 'Your package DXB2AUH001 has been picked up by Omar Al-Rashid', '{"packageCode": "DXB2AUH001", "driverName": "Omar Al-Rashid"}', TRUE, TRUE),
('750e8400-e29b-41d4-a716-446655440001', 'NEW_ASSIGNMENT', 'New Delivery Assignment', 'Pickup from Business Bay → Abu Dhabi | Est. AED 20', '{"requestId": "b50e8400-e29b-41d4-a716-446655440001", "commission": 20}', TRUE, TRUE),
('950e8400-e29b-41d4-a716-446655440001', 'INQUIRY_RECEIVED', 'New Delivery Inquiry', 'Future Tech Industries has submitted a new inquiry', '{"inquiryId": "a50e8400-e29b-41d4-a716-446655440001"}', TRUE, FALSE);

-- Sample reviews
INSERT INTO reviews (package_id, reviewer_user_id, driver_id, rating, comment) VALUES
('c50e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 5, 'Excellent service! Package delivered on time and driver was very professional.');

-- Sample driver location history
INSERT INTO driver_locations (driver_id, latitude, longitude, accuracy, heading, speed, timestamp) VALUES
('850e8400-e29b-41d4-a716-446655440001', 25.0772, 55.1345, 5.0, 45.0, 60.0, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
('850e8400-e29b-41d4-a716-446655440001', 25.0500, 55.1000, 5.0, 45.0, 65.0, CURRENT_TIMESTAMP - INTERVAL '25 minutes'),
('850e8400-e29b-41d4-a716-446655440001', 25.0200, 55.0500, 5.0, 45.0, 70.0, CURRENT_TIMESTAMP - INTERVAL '20 minutes'),
('850e8400-e29b-41d4-a716-446655440001', 24.9800, 55.0000, 5.0, 45.0, 75.0, CURRENT_TIMESTAMP - INTERVAL '15 minutes'),
('850e8400-e29b-41d4-a716-446655440001', 24.9500, 54.9500, 5.0, 45.0, 80.0, CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
('850e8400-e29b-41d4-a716-446655440001', 24.5000, 54.4000, 5.0, 45.0, 75.0, CURRENT_TIMESTAMP - INTERVAL '5 minutes');

-- Add more realistic app settings
INSERT INTO app_settings (key, value, description) VALUES
('notification_settings', '{"push_enabled": true, "email_enabled": true, "sms_enabled": true}', 'Notification delivery preferences'),
('pwa_update_interval', '300000', 'PWA cache update interval in milliseconds'),
('max_package_photos', '5', 'Maximum number of photos per package'),
('delivery_time_windows', '{"morning": "08:00-12:00", "afternoon": "12:00-17:00", "evening": "17:00-20:00"}', 'Available delivery time windows'),
('emergency_contacts', '{"support": "+971800123456", "operations": "+971501234567"}', 'Emergency contact numbers'),
('geofence_radius', '100', 'Geofence radius in meters for location-based triggers'),
('offline_sync_interval', '60000', 'Offline sync attempt interval in milliseconds');

COMMENT ON TABLE companies IS 'Sample companies for testing business PWA functionality';
COMMENT ON TABLE drivers IS 'Sample drivers for testing driver PWA and assignment features';
COMMENT ON TABLE delivery_requests IS 'Sample delivery requests showing the complete workflow';
COMMENT ON TABLE packages IS 'Sample packages with different types and statuses for testing';
COMMENT ON TABLE package_timeline IS 'Sample timeline entries showing package journey';
COMMENT ON TABLE notifications IS 'Sample notifications for testing PWA push notification system';