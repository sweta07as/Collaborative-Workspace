# Real-Time Collaborative Workspace Backend

A scalable, real-time collaborative workspace backend service for developers, similar to a simplified collaborative coding platform.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                   │
│              (Web/Mobile Applications)                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼───────┐       ┌───────▼───────┐
        │   REST API    │       │   WebSocket   │
        │   (Express)   │       │  (Socket.io)  │
        └───────┬───────┘       └───────┬───────┘
                │                       │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│    MySQL      │   │    Redis      │   │  Job Worker   │
│  (Primary DB) │   │ (Cache/Queue) │   │   (BullMQ)    │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Features

### Authentication & Authorization
- JWT-based authentication with access/refresh tokens
- Role-based access control (Owner, Collaborator, Viewer)
- Token refresh mechanism
- API rate limiting with Redis

### Project & Workspace Management
- Full CRUD operations for projects and workspaces
- Collaborator invitation and role management
- Ownership transfer capabilities

### Real-Time Collaboration
- WebSocket-based communication via Socket.io
- Redis Pub/Sub for horizontal scaling
- Events: user join/leave, file changes, cursor updates, activity status

### Asynchronous Job Processing
- BullMQ-powered job queue
- Retry logic with exponential backoff
- Idempotent job processing
- Job types: Code Execution, File Analysis (simulated)

### Data Storage
- MySQL for relational data (via Prisma ORM)
- Redis for caching and Pub/Sub

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **WebSocket**: Socket.io with Redis adapter
- **Database**: MySQL 8.0 with Prisma ORM
- **Cache/Queue**: Redis 7 with BullMQ
- **Testing**: Jest + Supertest
- **API Docs**: Swagger/OpenAPI
- **Containerization**: Docker + Docker Compose

## Project Structure

```
├── src/
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── modules/          # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── projects/     # Project management
│   │   ├── workspaces/   # Workspace management
│   │   ├── collaborators/# Collaborator management
│   │   ├── jobs/         # Job processing
│   │   └── realtime/     # WebSocket handlers
│   ├── shared/           # Shared utilities
│   ├── app.ts            # Express app setup
│   ├── index.ts          # Main entry point
│   └── worker.ts         # Job worker process
├── prisma/               # Database schema
├── tests/                # Test files
├── docker-compose.yml    # Production Docker setup
└── docker-compose.dev.yml# Development Docker setup
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd purplemerit_assignment
   ```

2. **Start development services (MySQL + Redis)**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Start the worker (in a separate terminal)**
   ```bash
   npm run worker
   ```

The API will be available at `http://localhost:3000`

### Production Deployment

```bash
# Build and run all services
docker-compose up -d

# Run migrations
docker-compose run --rm migrate

# View logs
docker-compose logs -f api worker
```

## API Documentation

### Interactive Documentation
Visit `http://localhost:3000/api-docs` for Swagger UI

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout user |
| GET | `/api/v1/auth/me` | Get current user |

### Project Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List user's projects |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects/:id` | Get project |
| PUT | `/api/v1/projects/:id` | Update project |
| DELETE | `/api/v1/projects/:id` | Delete project |

### Workspace Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/:id/workspaces` | List workspaces |
| POST | `/api/v1/projects/:id/workspaces` | Create workspace |
| GET | `/api/v1/workspaces/:id` | Get workspace |
| PUT | `/api/v1/workspaces/:id` | Update workspace |
| DELETE | `/api/v1/workspaces/:id` | Delete workspace |

### Collaborator Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects/:id/members` | List members |
| POST | `/api/v1/projects/:id/members/invite` | Invite user |
| PUT | `/api/v1/projects/:id/members/:userId` | Update role |
| DELETE | `/api/v1/projects/:id/members/:userId` | Remove member |
| POST | `/api/v1/projects/:id/leave` | Leave project |
| POST | `/api/v1/projects/:id/transfer-ownership` | Transfer ownership |

### Job Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/jobs` | Create job |
| GET | `/api/v1/jobs/:id` | Get job status |
| GET | `/api/v1/jobs/workspace/:id` | List workspace jobs |
| POST | `/api/v1/jobs/:id/cancel` | Cancel job |
| GET | `/api/v1/jobs/stats` | Queue statistics |

## WebSocket Events

### Client Events (Emit)

```javascript
// Join a workspace
socket.emit('join_workspace', workspaceId);

// Leave a workspace
socket.emit('leave_workspace', workspaceId);

// Send file change
socket.emit('file_change', {
  fileId: 'file-123',
  fileName: 'index.ts',
  changeType: 'update',
  content: '// new content'
});

// Send cursor update
socket.emit('cursor_update', {
  fileId: 'file-123',
  position: { line: 10, column: 5 }
});

// Send activity status
socket.emit('user_activity', {
  action: 'typing',
  fileId: 'file-123'
});
```

### Server Events (Listen)

```javascript
// User joined workspace
socket.on('user_joined', ({ userId, userName, timestamp }) => {});

// User left workspace
socket.on('user_left', ({ userId, userName, timestamp }) => {});

// File changed by another user
socket.on('file_changed', (data) => {});

// Cursor update from another user
socket.on('cursor_updated', (data) => {});

// Activity update from another user
socket.on('user_activity_updated', (data) => {});
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

## Design Decisions & Trade-offs

### 1. Technology Choices

**Express.js over Fastify/NestJS**
- Mature ecosystem with extensive middleware support
- Lower learning curve for maintainability
- Trade-off: Slightly lower raw performance than Fastify

**MySQL over PostgreSQL**
- Per user preference
- Good performance for read-heavy workloads
- Trade-off: Less feature-rich JSON support

**BullMQ over direct Redis queues**
- Built-in retry logic and job management
- Dashboard available for monitoring
- Trade-off: Additional dependency

### 2. Architecture Decisions

**Monolith with Modular Structure**
- Faster development and deployment
- Easier debugging and testing
- Can be split into microservices later if needed
- Trade-off: Single point of failure

**Separate Worker Process**
- Prevents job processing from blocking API requests
- Can scale workers independently
- Trade-off: More complex deployment

**Redis Pub/Sub for Real-time**
- Enables horizontal scaling of WebSocket servers
- Simple setup compared to Kafka
- Trade-off: No message persistence

### 3. Security Decisions

**Short-lived Access Tokens (15 min)**
- Reduces impact of token theft
- Refresh tokens for seamless UX
- Trade-off: More frequent token refreshes

**Role-based Access Control**
- Simple, effective permission model
- Three clear roles: Owner, Collaborator, Viewer
- Trade-off: Less granular than attribute-based control

## Scalability Considerations

### Horizontal Scaling

1. **API Servers**: Stateless design allows running multiple instances behind a load balancer

2. **WebSocket Servers**: Redis adapter enables Socket.io to work across multiple nodes

3. **Job Workers**: Can run multiple worker instances to process jobs in parallel

### Database Scaling

1. **Read Replicas**: MySQL supports read replicas for scaling read operations

2. **Connection Pooling**: Prisma manages connection pooling automatically

3. **Indexing**: Strategic indexes on frequently queried columns

### Caching Strategy

1. **User Sessions**: Cached in Redis for fast authentication

2. **Project/Workspace Data**: Cached with 5-minute TTL

3. **Cache Invalidation**: Explicit invalidation on data updates

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | MySQL connection string | Required |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | None |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_ACCESS_EXPIRY` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

## Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## License

MIT
