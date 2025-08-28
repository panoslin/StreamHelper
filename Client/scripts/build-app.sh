#!/bin/bash

# StreamHelper Client Build Script
# This script builds and packages the Electron application

set -e

echo "🚀 Building StreamHelper Client..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf dist-packages/

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Package for current platform
echo "📦 Packaging application..."
npm run package:current

echo "✅ Build completed successfully!"
echo ""
echo "📁 Build outputs:"
echo "   - App bundle: dist-packages/mac-arm64/StreamHelper Client.app"
echo "   - DMG package: dist-packages/StreamHelper Client-1.0.0-arm64.dmg"
echo ""
echo "🎯 To run the app:"
echo "   - Double-click the DMG file to mount"
echo "   - Drag StreamHelper Client to Applications folder"
echo "   - Or run directly: open 'dist-packages/mac-arm64/StreamHelper Client.app'"
echo ""
echo "🔧 To run in development mode:"
echo "   npm start"
