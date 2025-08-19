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

echo "⏳ Waiting for services to be ready..."

# Wait for TiDB to be ready
echo "🗄️  Waiting for TiDB..."
timeout 120s bash -c 'until docker exec tidb mysql -h localhost -P 4000 -u root -e "SELECT 1" > /dev/null 2>&1; do sleep 2; done' || {
    echo "❌ TiDB failed to start within 2 minutes"
    docker-compose logs tidb
    exit 1
}

# Wait for Kafka to be ready
echo "📨 Waiting for Kafka..."
timeout 120s bash -c 'until docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list > /dev/null 2>&1; do sleep 2; done' || {
    echo "❌ Kafka failed to start within 2 minutes"
    docker-compose logs kafka
    exit 1
}

# Wait for API to be ready
echo "🔗 Waiting for API..."
timeout 60s bash -c 'until curl -f http://localhost:3001/health > /dev/null 2>&1; do sleep 2; done' || {
    echo "❌ API failed to start within 1 minute"
    docker-compose logs api
    exit 1
}

# Wait for Client to be ready
echo "🖥️  Waiting for Client..."
timeout 60s bash -c 'until curl -f http://localhost:3000 > /dev/null 2>&1; do sleep 2; done' || {
    echo "❌ Client failed to start within 1 minute"
    docker-compose logs client
    exit 1
}

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