# Git-Proof Backend Implementation

This document describes the backend implementation for the Git-Proof distributed Git synchronization system.

## Architecture Overview

The backend is built using:
- **Next.js API Routes** - RESTful API endpoints
- **Prisma ORM** - Type-safe database access
- **SQLite** - Development database (easily swappable to PostgreSQL)
- **BullMQ** - Job queue for asynchronous operations
- **TypeScript** - Type safety throughout the codebase

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration.

3. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # Seed database with sample data
   npm run db:seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── dashboard/          # Dashboard stats and activity
│   │   ├── providers/          # Provider management
│   │   ├── sync-queue/         # Sync job management
│   │   ├── failover/          # Failover events
│   │   └── backup/            # Backup management
│   └── dashboard/             # Frontend pages
├── lib/
│   ├── db.ts                  # Prisma client instance
│   ├── types/                 # TypeScript types
│   ├── validations/           # Zod validation schemas
│   ├── providers/             # Provider adapters
│   │   ├── base.ts           # Base adapter class
│   │   ├── github.ts         # GitHub adapter
│   │   └── ... (other providers)
│   └── api-client.ts         # Frontend API client
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts              # Database seeding
└── components/              # React components
```

## API Endpoints

### Dashboard
- `GET /api/dashboard/stats` - Get system statistics
- `GET /api/dashboard/activity` - Get recent activity

### Providers
- `GET /api/providers` - List all providers
- `POST /api/providers` - Create a new provider
- `GET /api/providers/[id]` - Get provider details
- `PUT /api/providers/[id]` - Update provider
- `DELETE /api/providers/[id]` - Delete provider
- `POST /api/providers/[id]/test` - Test provider connection

### Sync Queue
- `GET /api/sync-queue` - List sync jobs (with filters)
- `POST /api/sync-queue` - Create new sync job
- `GET /api/sync-queue/stats` - Get queue statistics
- `PUT /api/sync-queue/[id]/priority` - Update job priority
- `DELETE /api/sync-queue/[id]` - Cancel sync job

### Failover
- `GET /api/failover/events` - List failover events
- `POST /api/failover/events` - Create failover event
- `GET /api/failover/rules` - Get failover rules
- `PUT /api/failover/rules` - Update failover rules

### Backup
- `GET /api/backup/status` - Get backup status
- `POST /api/backup/status` - Trigger manual backup

## Provider Adapters

The system uses a plugin architecture for Git providers:

1. **Base Adapter** (`lib/providers/base.ts`)
   - Abstract class defining the provider interface
   - Common helper methods
   - Error handling

2. **GitHub Adapter** (`lib/providers/github.ts`)
   - Full implementation for GitHub API
   - Supports all GitHub features

3. **Adding New Providers**
   - Extend `BaseProviderAdapter`
   - Implement all abstract methods
   - Register with `ProviderAdapterFactory`

## Key Components Implemented

### 1. Database Schema
- Providers, Repositories, Sync Jobs
- Failover Events, Alerts, Audit Logs
- System Configuration

### 2. API Layer
- RESTful endpoints with proper error handling
- Request validation using Zod
- Pagination and filtering support

### 3. Provider Abstraction
- Pluggable architecture for Git providers
- Common interface for all providers
- GitHub adapter fully implemented

### 4. Frontend Integration
- Updated dashboard to use real API data
- Server-side rendering for better performance
- Proper error handling

## Next Steps for Full Implementation

### 1. Complete Provider Adapters
- [ ] GitLab adapter implementation
- [ ] Forgejo adapter implementation
- [ ] Custom Git server adapter

### 2. Job Queue Implementation
- [ ] Set up Redis for BullMQ
- [ ] Implement sync job workers
- [ ] Add retry and error handling logic

### 3. Core Services
- [ ] Distribution Engine
- [ ] Conflict Resolution System
- [ ] Failover Manager
- [ ] Alert System

### 4. Authentication & Security
- [ ] JWT-based authentication
- [ ] API rate limiting
- [ ] Credential encryption
- [ ] Audit logging

### 5. Real-time Features
- [ ] WebSocket support for live updates
- [ ] Server-sent events for progress tracking
- [ ] Real-time alerts

### 6. Testing
- [ ] Unit tests for all components
- [ ] Integration tests for API endpoints
- [ ] End-to-end tests
- [ ] Load testing

## Development Notes

1. **Database**: Currently using SQLite for simplicity. For production, switch to PostgreSQL by updating the Prisma schema datasource.

2. **Job Queue**: BullMQ requires Redis. Install and run Redis locally for full job queue functionality.

3. **Authentication**: Basic structure is in place, but full authentication implementation is pending.

4. **Error Handling**: All API endpoints include proper error handling and validation.

5. **Type Safety**: Full TypeScript coverage with strict mode enabled.

## Testing the Implementation

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **View the dashboard**: Navigate to http://localhost:3000/dashboard

3. **Test API endpoints** using curl or a tool like Postman:
   ```bash
   # Get dashboard stats
   curl http://localhost:3000/api/dashboard/stats
   
   # List providers
   curl http://localhost:3000/api/providers
   ```

4. **Explore the database**:
   ```bash
   npm run db:studio
   ```

This implementation provides a solid foundation for the Git-Proof backend system. The architecture is scalable, maintainable, and ready for additional features.