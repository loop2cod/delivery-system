#!/bin/bash

# Build Admin PWA Script
set -e

echo "🔥 Building Admin PWA..."

# Install dependencies
echo "📦 Installing Admin PWA dependencies..."
cd packages/admin-pwa
pnpm install

# Build admin PWA
echo "🔨 Building Admin PWA..."
pnpm run build

# Verify build
if [ -d ".next" ]; then
    echo "✅ Admin PWA build successful!"
else
    echo "❌ Admin PWA build failed!"
    exit 1
fi

cd ../..
echo "🎉 Admin PWA build completed!"