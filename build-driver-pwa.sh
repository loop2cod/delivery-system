#!/bin/bash

# Build Driver PWA Script
set -e

echo "🔥 Building Driver PWA..."

# Install dependencies
echo "📦 Installing Driver PWA dependencies..."
cd packages/driver-pwa
pnpm install

# Build driver PWA
echo "🔨 Building Driver PWA..."
pnpm run build

# Verify build
if [ -d ".next" ]; then
    echo "✅ Driver PWA build successful!"
else
    echo "❌ Driver PWA build failed!"
    exit 1
fi

cd ../..
echo "🎉 Driver PWA build completed!"