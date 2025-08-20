#!/bin/bash

set -e

echo "🚀 Starting SRE Test Application..."
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

echo "🔧 Setting up project directories..."

# Create necessary directories if they don't exist
mkdir -p client/src/components
mkdir -p client/public
mkdir -p api/src/config
mkdir -p api/src/middleware
mkdir -p api/src/routes
mkdir -p api/src/models
mkdir -p api/init
mkdir -p consumer/src
mkdir -p cdc-config

echo "📦 Building and starting services..."

# Stop any existing containers
docker-compose down --remove-orphans

# Build and start all services
docker-compose up --build -d

echo ""
echo "✅ All services are ready!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:3001"
echo "   TiDB:     mysql://root@localhost:4000"
echo ""
echo "👤 Default Login Credentials:"
echo "   Email:    admin@test.com"
echo "   Password: admin123"
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "📋 To view logs:"
echo "   All services: docker-compose logs -f"
echo "   Specific:     docker-compose logs -f [service-name]"
echo ""
echo "🛑 To stop:"
echo "   docker-compose down"
echo ""
echo "🎉 Setup complete! Open http://localhost:3000 in your browser."