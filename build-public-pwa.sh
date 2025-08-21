#!/bin/bash

# Build Public PWA Script
set -e

echo "🔥 Building Public PWA..."

# Install dependencies
echo "📦 Installing Public PWA dependencies..."
cd packages/public-pwa
pnpm install

# Build public PWA
echo "🔨 Building Public PWA..."
pnpm run build

# Verify build
if [ -d ".next" ]; then
    echo "✅ Public PWA build successful!"
else
    echo "❌ Public PWA build failed!"
    exit 1
fi

cd ../..
echo "🎉 Public PWA build completed!"