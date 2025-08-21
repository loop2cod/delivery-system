#!/bin/bash

# Build Business PWA Script
set -e

echo "🔥 Building Business PWA..."

# Install dependencies
echo "📦 Installing Business PWA dependencies..."
cd packages/business-pwa
pnpm install

# Build business PWA
echo "🔨 Building Business PWA..."
pnpm run build

# Verify build
if [ -d ".next" ]; then
    echo "✅ Business PWA build successful!"
else
    echo "❌ Business PWA build failed!"
    exit 1
fi

cd ../..
echo "🎉 Business PWA build completed!"