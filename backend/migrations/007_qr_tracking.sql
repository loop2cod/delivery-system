-- QR Code tracking tables for package and delivery management

-- QR code generations log
CREATE TABLE IF NOT EXISTS qr_generations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    qr_type VARCHAR(20) NOT NULL CHECK (qr_type IN ('package', 'delivery', 'inquiry', 'tracking')),
    item_id VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_qr_generations_user_id (user_id),
    INDEX idx_qr_generations_type (qr_type),
    INDEX idx_qr_generations_item_id (item_id),
    INDEX idx_qr_generations_created_at (created_at)
);

-- QR code scans log
CREATE TABLE IF NOT EXISTS qr_scans (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    qr_type VARCHAR(20) NOT NULL CHECK (qr_type IN ('package', 'delivery', 'inquiry', 'tracking')),
    item_id VARCHAR(255) NOT NULL,
    scanner_id VARCHAR(255), -- Device/scanner identifier
    location JSONB, -- GPS coordinates of scan
    metadata JSONB DEFAULT '{}',
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_qr_scans_user_id (user_id),
    INDEX idx_qr_scans_type (qr_type),
    INDEX idx_qr_scans_item_id (item_id),
    INDEX idx_qr_scans_scanned_at (scanned_at),
    INDEX idx_qr_scans_location USING GIN (location)
);

-- Add QR tracking fields to existing tables
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS last_scanned_by UUID REFERENCES users(id);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS last_scan_location JSONB;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS qr_code_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMP;

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS last_scanned_by UUID REFERENCES users(id);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS qr_code_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMP;

-- Create indexes for new QR tracking fields
CREATE INDEX IF NOT EXISTS idx_deliveries_last_scanned_at ON deliveries(last_scanned_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_qr_generated ON deliveries(qr_code_generated);
CREATE INDEX IF NOT EXISTS idx_inquiries_last_scanned_at ON inquiries(last_scanned_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_qr_generated ON inquiries(qr_code_generated);

-- QR analytics view for reporting
CREATE OR REPLACE VIEW qr_analytics AS
SELECT 
    'generation' as activity_type,
    qg.qr_type,
    qg.item_id,
    qg.created_at as timestamp,
    u.name as user_name,
    u.role as user_role,
    qg.metadata
FROM qr_generations qg
LEFT JOIN users u ON qg.user_id = u.id

UNION ALL

SELECT 
    'scan' as activity_type,
    qs.qr_type,
    qs.item_id,
    qs.scanned_at as timestamp,
    u.name as user_name,
    u.role as user_role,
    qs.metadata
FROM qr_scans qs
LEFT JOIN users u ON qs.user_id = u.id;

-- QR usage statistics view
CREATE OR REPLACE VIEW qr_usage_stats AS
SELECT 
    qr_type,
    COUNT(CASE WHEN activity_type = 'generation' THEN 1 END) as total_generated,
    COUNT(CASE WHEN activity_type = 'scan' THEN 1 END) as total_scanned,
    COUNT(DISTINCT CASE WHEN activity_type = 'generation' THEN user_name END) as unique_generators,
    COUNT(DISTINCT CASE WHEN activity_type = 'scan' THEN user_name END) as unique_scanners,
    MIN(timestamp) as first_activity,
    MAX(timestamp) as last_activity
FROM qr_analytics
GROUP BY qr_type;

-- Add comments for documentation
COMMENT ON TABLE qr_generations IS 'Log of all QR code generations by users';
COMMENT ON TABLE qr_scans IS 'Log of all QR code scans by users';
COMMENT ON VIEW qr_analytics IS 'Combined view of QR generation and scan activities';
COMMENT ON VIEW qr_usage_stats IS 'Statistical summary of QR code usage by type';

-- Grant permissions (adjust as needed based on your user roles)
GRANT SELECT, INSERT ON qr_generations TO backend_user;
GRANT SELECT, INSERT ON qr_scans TO backend_user;
GRANT SELECT ON qr_analytics TO backend_user;
GRANT SELECT ON qr_usage_stats TO backend_user;

-- Sample data for testing (optional)
-- INSERT INTO qr_generations (user_id, qr_type, item_id, metadata) VALUES
-- ((SELECT id FROM users WHERE role = 'admin' LIMIT 1), 'package', 'TEST_PKG_001', '{"test": true}'),
-- ((SELECT id FROM users WHERE role = 'business' LIMIT 1), 'delivery', 'TEST_DEL_001', '{"test": true}');

-- Trigger to automatically update QR generation status on deliveries
CREATE OR REPLACE FUNCTION update_qr_generated_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qr_type = 'package' OR NEW.qr_type = 'delivery' THEN
        UPDATE deliveries 
        SET qr_code_generated = TRUE, qr_code_generated_at = NEW.created_at
        WHERE id = NEW.item_id;
    ELSIF NEW.qr_type = 'inquiry' THEN
        UPDATE inquiries 
        SET qr_code_generated = TRUE, qr_code_generated_at = NEW.created_at
        WHERE id = NEW.item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_qr_generated_status
    AFTER INSERT ON qr_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_generated_status();