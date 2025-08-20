#!/bin/bash

echo "=== Setting up Production Environment ==="

# Check if we're in production mode
if [ "$NODE_ENV" = "production" ]; then
    echo "Production mode detected"
    
    # Copy production environment file if it exists
    if [ -f ".env.production" ]; then
        echo "Using .env.production for environment variables"
        cp .env.production .env
    else
        echo "Warning: .env.production not found, creating from docker-compose environment"
        
        # Create .env file from environment variables passed by docker-compose
        cat > .env << EOF
# Generated from docker-compose environment variables
NODE_ENV=${NODE_ENV:-production}
PORT=${PORT:-3000}

# MongoDB Configuration
MONGODB_URL=${MONGODB_URI:-mongodb://localhost:27017/delivery_uae_dev}
MONGODB_URI=${MONGODB_URI:-mongodb://localhost:27017/delivery_uae_dev}
MONGODB_HOST=${MONGODB_HOST:-localhost}
MONGODB_PORT=${MONGODB_PORT:-27017}
MONGODB_DB_NAME=${MONGODB_DB_NAME:-delivery_uae_dev}

# Redis Configuration
REDIS_URL=${REDIS_URL:-redis://localhost:6379}

# JWT Configuration
JWT_SECRET=${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
COOKIE_SECRET=${COOKIE_SECRET:-your-super-secret-cookie-key-change-in-production}

# CORS Configuration
CORS_ORIGINS=${CORS_ORIGIN:-http://localhost:3000}

# Feature Flags
ENABLE_SWAGGER=false
ENABLE_PLAYGROUND=false
TRUST_PROXY=true
EOF
        echo "Created .env from environment variables"
    fi
    
    # Ensure required directories exist
    mkdir -p logs
    mkdir -p uploads
    
    # Set proper permissions
    chmod 755 logs uploads
    
    echo "Production environment setup complete"
else
    echo "Development mode - using existing .env or defaults"
fi

# Display configuration (without sensitive data)
echo ""
echo "=== Environment Configuration ==="
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "PORT: ${PORT:-not set}"
echo "MONGODB_URI present: $([ -n "$MONGODB_URI" ] && echo "yes" || echo "no")"
echo "REDIS_URL present: $([ -n "$REDIS_URL" ] && echo "yes" || echo "no")"
echo "JWT_SECRET present: $([ -n "$JWT_SECRET" ] && echo "yes" || echo "no")"
echo "=================================="