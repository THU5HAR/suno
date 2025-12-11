#!/bin/bash

# Docker startup script for Playlist Studio

echo "🚀 Starting Playlist Studio with Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Build and start services
echo "📦 Building and starting containers..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check backend health
echo "🔍 Checking backend health..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed. Check logs with: docker-compose logs backend"
fi

echo ""
echo "✅ Services are starting!"
echo ""
echo "📍 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo "   Health Check: http://localhost:3001/api/health"
echo ""
echo "📋 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo ""


