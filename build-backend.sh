#!/bin/bash

# Build Backend Script
set -e

echo "🔥 Building Backend..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pnpm install

# Build backend
echo "🔨 Building backend..."
pnpm run build

# Verify build
if [ -d "dist" ]; then
    echo "✅ Backend build successful!"
else
    echo "❌ Backend build failed!"
    exit 1
fi

cd ..
echo "🎉 Backend build completed!"