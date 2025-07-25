# UAE Delivery Management System - Database

This directory contains the database schema, migrations, and setup for the UAE Delivery Management PWA system.

## 🗄️ Database Architecture

### Core Tables
- **users** - All system users (customers, drivers, business users, admins)
- **companies** - Business customers using the delivery service
- **drivers** - Driver profiles and vehicle information
- **delivery_requests** - Customer delivery requests
- **packages** - Individual packages within delivery requests
- **inquiries** - Customer inquiries from public PWA
- **notifications** - Push notifications for all PWAs

### PWA-Specific Tables
- **offline_sync_queue** - Offline actions queue for PWA sync
- **user_sessions** - PWA authentication sessions
- **package_timeline** - Real-time package tracking
- **driver_locations** - GPS tracking history

## 🚀 Quick Start

### Development Setup with Docker

```bash
# Start database services
cd database
docker-compose up -d

# Start with development tools (pgAdmin, Redis Commander)
docker-compose --profile dev up -d

# View logs
docker-compose logs -f postgres

# Stop services
docker-compose down
```

### Database Access

**PostgreSQL:**
- Host: `localhost:5432`
- Database: `delivery_uae_dev`
- Username: `delivery_user`
- Password: `delivery_pass_2025`

**Redis:**
- Host: `localhost:6379`
- Password: `redis_pass_2025`

**pgAdmin (Development):**
- URL: http://localhost:5050
- Email: `admin@deliveryuae.com`
- Password: `admin_pass_2025`

**Redis Commander (Development):**
- URL: http://localhost:8081
- Username: `admin`
- Password: `admin_pass_2025`

### Manual Setup

If you prefer manual setup without Docker:

```bash
# 1. Create PostgreSQL database
createdb delivery_uae_dev

# 2. Install PostGIS extension
psql delivery_uae_dev -c "CREATE EXTENSION postgis;"

# 3. Run schema
psql delivery_uae_dev -f schema.sql

# 4. Load sample data (optional)
psql delivery_uae_dev -f seeds.sql
```

## 📋 Schema Overview

### User Management
```sql
-- Multi-role user system
users (id, email, name, phone, role, status)
├── CUSTOMER - Public website users
├── BUSINESS - Company portal users  
├── DRIVER - Mobile app users
├── ADMIN - Control panel users
└── SUPER_ADMIN - System administrators

-- Business customers
companies (id, name, trade_license, status, account_type)
└── company_users (company_id, user_id, is_primary)

-- Driver profiles
drivers (id, user_id, license_number, vehicle_type, status, rating)
```

### Delivery Management
```sql
-- Customer inquiries (Public PWA)
inquiries (id, reference_number, company_name, status)

-- Delivery requests (Business PWA)
delivery_requests (id, request_number, company_id, status)
└── packages (id, request_id, package_code, status, qr_code)
    └── package_timeline (id, package_id, status, timestamp)

-- Driver tracking
driver_locations (id, driver_id, latitude, longitude, timestamp)
```

### PWA Features
```sql
-- Offline synchronization
offline_sync_queue (id, user_id, action_type, payload, processed)

-- Push notifications
notifications (id, user_id, type, title, body, sent, push_sent)

-- Authentication sessions
user_sessions (id, user_id, token_hash, pwa_type, expires_at)
```

## 🔧 Database Functions

### Package Code Generation
```sql
-- Generate unique package codes like DXB2AUH001234567890
SELECT generate_package_code('DUBAI'::emirate, 'ABU_DHABI'::emirate);
```

### Pricing Calculations
The database stores pricing rules in `app_settings` table:
- Base rates per emirate
- Package type multipliers
- Volume discounts
- Insurance rates

### Automated Triggers
- `updated_at` timestamp updates
- Package timeline automatic entries
- Location-based geofencing alerts

## 📊 Sample Data

The `seeds.sql` file includes:
- 3 sample companies (Al-Manara Trading, Emirates Tech, Gulf Medical)
- 3 sample drivers (Omar, Hassan, Khalid)
- 2 sample admin users
- Sample delivery requests and packages
- Package timeline entries
- Notifications and reviews

This provides a complete test dataset for all PWA applications.

## 🔍 Indexes & Performance

### Critical Indexes
- User email and role lookups
- Package status and tracking queries
- Driver location and availability
- Real-time notification queries
- Company and request filtering

### Query Optimization
- Partitioned tables for location history
- Optimized joins for package tracking
- Efficient filtering for PWA data requirements

## 🔐 Security Features

- UUID primary keys prevent enumeration
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Session token management
- Input validation at database level

## 🔄 Migrations

Use the `migrations/` directory for schema changes:

```bash
# Apply migration
psql delivery_uae_dev -f migrations/001_initial_schema.sql

# Check migration status
psql delivery_uae_dev -c "SELECT * FROM schema_migrations;"
```

## 🏥 Health Monitoring

Database health checks are built into Docker Compose:
- PostgreSQL connection tests
- Redis availability checks
- Performance monitoring queries

## 📈 Scaling Considerations

The schema is designed for:
- Horizontal scaling with read replicas
- Connection pooling support
- Efficient indexing for high-volume queries
- Real-time data requirements for PWAs
- Offline synchronization capabilities

---

**Production Note**: Change all default passwords and configure proper SSL certificates before production deployment.