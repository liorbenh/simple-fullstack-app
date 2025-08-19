# SRE Home Test Assignment - Full Stack Application

## Overview

This is a complete full-stack application built for the SRE home test assignment. It includes:

- **Frontend**: React application with user authentication
- **Backend**: Node.js/Express API with JWT authentication
- **Database**: TiDB with automatic initialization
- **Message Queue**: Apache Kafka for real-time data processing
- **CDC**: TiDB Change Data Capture for database monitoring
- **Logging**: Structured logging with log4js
- **Containerization**: Complete Docker setup

## Quick Start

**Prerequisites**: Docker and Docker Compose installed

1. **Clone and run**:
   ```bash
   git clone <your-repo>
   cd simple-fullstack-app
   chmod +x start.sh
   ./start.sh
   ```

2. **Access the application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - TiDB: localhost:4000

## Default Credentials

- **Email**: admin@test.com
- **Password**: admin123

## Services

### Frontend (Port 3000)
- React application with login interface
- JWT token management
- Form validation
- Responsive design

### API (Port 3001)
- Node.js/Express RESTful API
- User authentication with JWT
- Database integration with TiDB
- Structured logging for all user activities

### Database (TiDB - Port 4000)
- Automatic schema initialization
- Default user creation
- User tokens and activity logging tables

### Message Queue (Kafka - Port 9092)
- Apache Kafka with Zookeeper
- Real-time message processing
- CDC message consumption

### CDC Consumer (Port 3002)
- Monitors database changes via TiDB CDC
- Processes and logs all database modifications
- Kafka message consumption and processing

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   React     │    │   Node.js   │    │    TiDB     │
│   Client    │◄──►│     API     │◄──►│  Database   │
│  (Port 3000)│    │ (Port 3001) │    │ (Port 4000) │
└─────────────┘    └─────────────┘    └─────────────┘
                          │                    │
                          ▼                    ▼
                   ┌─────────────┐    ┌─────────────┐
                   │    Kafka    │◄───│  TiDB CDC   │
                   │ (Port 9092) │    │ (Port 8300) │
                   └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ CDC Consumer│
                   │ (Port 3002) │
                   └─────────────┘
```

## Features Implemented

### Part 1: Simple Development ✅
- ✅ React frontend with login interface
- ✅ Node.js RESTful API
- ✅ TiDB database integration
- ✅ JWT token management stored in database
- ✅ Form validation

### Part 2: DevOps Implementation ✅
- ✅ Docker containers for all services
- ✅ Docker Compose orchestration
- ✅ TiDB configured in Docker environment
- ✅ Apache Kafka message broker
- ✅ Automatic database initialization

### Part 3: Monitoring & Logging ✅
- ✅ Structured user activity logging with log4js
- ✅ TiDB CDC implementation
- ✅ Real-time database change monitoring
- ✅ Kafka consumer for CDC messages
- ✅ JSON formatted logs with timestamps, user ID, IP address

## API Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `GET /api/user/profile` - Get user profile
- `GET /health` - Health check

## Monitoring & Logging

### User Activity Logs
Every login/logout action is logged in structured JSON format:
```json
{
  "timestamp": "2025-08-19T10:30:45.123Z",
  "userId": 1,
  "action": "login",
  "ipAddress": "172.18.0.1",
  "userAgent": "Mozilla/5.0...",
  "email": "admin@test.com"
}
```

### Database Change Logs
All database modifications are captured via CDC and logged:
```json
{
  "timestamp": "2025-08-19T10:30:45.123Z",
  "source": "database-cdc",
  "changeType": "insert",
  "table": "users",
  "database": "sre_test",
  "primaryKey": {"id": 1},
  "changes": {...}
}
```

## Development

### Local Development
```bash
# API Development
cd api && npm run dev

# Client Development
cd client && npm start

# Consumer Development
cd consumer && npm run dev
```

### Viewing Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f consumer
```

### Health Checks
- API Health: http://localhost:3001/health
- Consumer Health: http://localhost:3002/health

## Troubleshooting

### Common Issues

1. **Services not starting**: Wait for dependencies to be ready
2. **Database connection issues**: Check TiDB container status
3. **Kafka connectivity**: Ensure Kafka and Zookeeper are running
4. **CDC not working**: Verify TiDB CDC service is healthy

### Cleanup
```bash
docker-compose down -v
docker system prune -f
```

## Technology Stack

- **Frontend**: React 18, CSS3
- **Backend**: Node.js 18, Express.js
- **Database**: TiDB (MySQL-compatible)
- **Message Queue**: Apache Kafka
- **CDC**: TiDB Change Data Capture
- **Logging**: log4js
- **Containerization**: Docker, Docker Compose
- **Authentication**: JWT tokens

## Project Structure

```
simple-fullstack-app/
├── docker-compose.yml          # Main orchestration
├── start.sh                    # One-command startup
├── README.md                   # This file
├── client/                     # React frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
├── api/                        # Node.js backend
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── init/
├── consumer/                   # CDC consumer service
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── cdc-config/                 # CDC configuration
    └── cdc-task.json
```

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React application |
| **API** | http://localhost:3001 | RESTful API server |
| **TiDB** | mysql://root@localhost:4000 | Database connection |
| **Kafka** | localhost:9092 | Message broker |
| **CDC** | http://localhost:8300 | Change Data Capture |

## 👤 Default Credentials

- **Email:** admin@test.com
- **Password:** admin123

## 🧩 Components

### 1. Frontend (React)
- **Location:** `client/`
- **Framework:** React 18
- **Features:**
  - Login/logout functionality
  - Form validation
  - Token-based authentication
  - Responsive design

### 2. Backend API (Node.js + Express)
- **Location:** `api/`
- **Features:**
  - JWT authentication
  - User token management in database
  - RESTful endpoints
  - Structured logging with log4js
  - Database connection pooling

### 3. Database (TiDB)
- **Type:** Distributed SQL database
- **Tables:**
  - `users` - User accounts
  - `user_tokens` - Active JWT tokens
  - `user_activities` - Login/logout logs
- **Auto-initialization:** Schema and default user

### 4. Message Queue (Apache Kafka)
- **Purpose:** Stream database changes
- **Topics:** `tidb-cdc-changes`
- **Configuration:** Single broker with Zookeeper

### 5. Change Data Capture (TiDB CDC)
- **Function:** Captures database changes
- **Output:** Streams changes to Kafka
- **Configuration:** JSON-based changefeed

### 6. CDC Consumer (Node.js)
- **Purpose:** Process database change events
- **Features:**
  - Kafka message consumption
  - Structured logging
  - Health check endpoint

## 📊 Monitoring & Logging

### User Activity Logging
Every user login/logout generates structured JSON logs:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "userId": 1,
  "action": "login",
  "ipAddress": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "email": "admin@test.com"
}
```

### Database Change Monitoring
All database operations (INSERT/UPDATE/DELETE) are captured via TiDB CDC:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "source": "database-cdc",
  "changeType": "insert",
  "table": "users",
  "database": "sre_test",
  "primaryKey": {"id": 1},
  "changes": {...}
}
```

## 🐳 Docker Configuration

### Services Architecture
- **Multi-stage builds** for optimization
- **Health checks** for service dependencies
- **Volume mounts** for development
- **Network isolation** with custom bridge
- **Security** with non-root users

### Key Features
- Automatic service dependency management
- Persistent data volumes
- Environment-based configuration
- Container health monitoring

## 🛠️ Development

### Local Development
```bash
# Start in development mode
docker-compose up --build

# View logs
docker-compose logs -f

# Access database
docker exec -it tidb mysql -h localhost -P 4000 -u root

# Restart specific service
docker-compose restart api
```

### Database Operations
```bash
# Connect to TiDB
mysql -h localhost -P 4000 -u root

# View CDC status
curl http://localhost:8300/api/v1/changefeeds

# Check Kafka topics
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list
```

### Monitoring Commands
```bash
# View API logs
docker-compose logs -f api

# View consumer logs
docker-compose logs -f consumer

# View CDC logs
docker-compose logs -f ticdc

# Service health checks
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## 🔧 Configuration

### Environment Variables

#### API Service
```env
NODE_ENV=production
DB_HOST=tidb
DB_PORT=4000
DB_USER=root
DB_PASSWORD=
DB_NAME=sre_test
KAFKA_BROKERS=kafka:29092
JWT_SECRET=your-secret-key-here
```

#### Consumer Service
```env
KAFKA_BROKERS=kafka:29092
KAFKA_TOPIC=tidb-cdc-changes
HEALTH_PORT=3002
```

#### Client Service
```env
REACT_APP_API_URL=http://localhost:3001
```

## 📋 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### User Tokens Table
```sql
CREATE TABLE user_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### User Activities Table
```sql
CREATE TABLE user_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🚨 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check Docker daemon
docker info

# Check port conflicts
netstat -tulpn | grep -E ":(3000|3001|4000|9092)"

# Clean restart
docker-compose down --volumes
docker-compose up --build
```

#### Database Connection Issues
```bash
# Check TiDB health
docker exec tidb mysql -h localhost -P 4000 -u root -e "SELECT 1"

# View TiDB logs
docker-compose logs tidb
```

#### Kafka/CDC Issues
```bash
# Check Kafka status
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# View CDC changefeeds
curl http://localhost:8300/api/v1/changefeeds

# Check consumer group
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

### Log Locations
- **API logs:** `docker-compose logs api`
- **Consumer logs:** `docker-compose logs consumer`
- **TiDB logs:** `docker-compose logs tidb`
- **CDC logs:** `docker-compose logs ticdc`

## 🧪 Testing the System

### 1. Authentication Flow
1. Open http://localhost:3000
2. Login with admin@test.com / admin123
3. Check API logs for structured login event
4. Logout and verify cleanup

### 2. Database Change Monitoring
1. Login to trigger database INSERT
2. Check consumer logs for CDC events
3. Perform additional database operations
4. Verify all changes are captured

### 3. Health Checks
```bash
# Check all service health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:8300/status
```

## 📝 Implementation Details

### Security Features
- **Password hashing** with bcrypt
- **JWT tokens** with expiration
- **Database token storage** for revocation
- **Input validation** on all endpoints
- **CORS configuration** for cross-origin requests

### Performance Optimizations
- **Connection pooling** for database
- **Async/await** patterns throughout
- **Health checks** for service dependencies
- **Graceful shutdown** handling
- **Resource limits** in Docker

### Monitoring Capabilities
- **Structured JSON logging** with log4js
- **Real-time change tracking** via CDC
- **Kafka message processing** with error handling
- **Service health endpoints**
- **Database activity logging**

## 🎯 Requirements Compliance

✅ **Part 1: Simple Development**
- React frontend with login interface
- Node.js RESTful API
- TiDB database integration
- User token management in database

✅ **Part 2: DevOps Implementation**
- Docker containerization for all services
- TiDB in Docker environment
- Apache Kafka message broker
- Automatic database initialization

✅ **Part 3: Monitoring & Logging**
- User activity logging with log4js
- TiDB CDC implementation
- Real-time data processing with Kafka consumer
- Structured logging format throughout

## 🤝 Support

For questions about implementation details:
- Check service logs: `docker-compose logs [service-name]`
- Review configuration files in each service directory
- Verify environment variables and Docker setup
- Test individual components using health check endpoints

## 📚 Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Frontend** | React | 18.x | User interface |
| **Backend** | Node.js + Express | 18.x + 4.x | API server |
| **Database** | TiDB | Latest | Distributed SQL |
| **Message Queue** | Apache Kafka | Latest | Event streaming |
| **CDC** | TiDB CDC | Latest | Change capture |
| **Logging** | log4js | 6.x | Structured logging |
| **Container** | Docker + Compose | Latest | Orchestration |
| **Authentication** | JWT | 9.x | Token-based auth |

---

*This implementation provides a complete, production-ready full-stack application that demonstrates modern DevOps practices, real-time monitoring, and scalable architecture patterns. All components are containerized and can be deployed with a single command.*