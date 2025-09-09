#!/usr/bin/env bash

echo "🔧 Clearing Netlify cache and rebuilding functions..."

# Stop any running netlify dev processes
pkill -f "netlify dev" || true
sleep 2

# Clear Netlify cache
rm -rf .netlify/functions-serve
rm -rf .netlify/functions
rm -rf node_modules/.cache
rm -rf dist

echo "🔄 Reinstalling function dependencies..."
cd netlify/functions
npm install
cd ../..

echo "🚀 Starting fresh development environment..."
npm run dev