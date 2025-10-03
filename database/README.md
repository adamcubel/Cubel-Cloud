# Database Setup

This directory contains database schema and migration files for Cubel Cloud.

## Automatic Schema Initialization

**The application automatically initializes the database schema on startup!**

The schema is created automatically when:

1. Database configuration is present (`config/database.json`)
2. Database connection is successful
3. Tables don't already exist

You only need to:

1. Create the database and user
2. Configure the connection settings

The application will handle the rest.

## Initial Setup

### 1. Create Database and User

Connect to PostgreSQL as a superuser and run:

```sql
-- Create database
CREATE DATABASE cubel_cloud;

-- Create user
CREATE USER cubel_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cubel_cloud TO cubel_user;
```

### 2. Create Database Configuration

Copy the example configuration file:

```bash
cp config/database.example.json config/database.json
```

Edit `config/database.json` with your PostgreSQL credentials:

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "cubel_cloud",
  "user": "cubel_user",
  "password": "your_secure_password",
  "ssl": false
}
```

### 3. Start the Application

The schema will be automatically initialized on startup:

```bash
npm run server
```

You should see logs like:

```
[Database] Successfully connected to PostgreSQL
[Database] Checking if schema initialization is needed...
[Database] Initializing database schema...
[Database] ✓ Schema initialized successfully
[Database] ✓ Created table: access_requests
[Database] ✓ Created indexes
[Database] ✓ Created triggers
```

## Manual Schema Application (Optional)

If you prefer to manually apply the schema:

```bash
psql -U cubel_user -d cubel_cloud -f database/schema.sql
```

Or if you're using a superuser:

```bash
psql -U postgres -d cubel_cloud -f database/schema.sql
```

## Schema Overview

### Tables

#### `access_requests`

Stores user requests for application access.

**Columns:**

- `id` (UUID, Primary Key) - Unique identifier for the request
- `user_id` (VARCHAR) - User ID from OIDC token
- `user_email` (VARCHAR) - User's email address
- `user_name` (VARCHAR) - User's display name
- `application_id` (VARCHAR) - ID of the requested application
- `application_name` (VARCHAR) - Display name of the application
- `status` (VARCHAR) - Request status: `pending`, `approved`, or `rejected`
- `requested_at` (TIMESTAMP) - When the request was created
- `processed_at` (TIMESTAMP) - When the request was approved/rejected
- `processed_by` (VARCHAR) - Email of the admin who processed the request
- `notes` (TEXT) - Optional notes from admin or user
- `created_at` (TIMESTAMP) - Record creation timestamp
- `updated_at` (TIMESTAMP) - Record last update timestamp

**Indexes:**

- `idx_access_requests_user_id` - Fast lookup by user ID
- `idx_access_requests_status` - Fast filtering by status
- `idx_access_requests_application_id` - Fast filtering by application
- `idx_access_requests_requested_at` - Fast sorting by request date

## API Endpoints

### Get All Access Requests (Admin)

```bash
GET /api/access-requests
```

Returns all access requests, ordered by status (pending first) and date.

### Create Access Request

```bash
POST /api/access-requests
Content-Type: application/json

{
  "userId": "user-123",
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "applicationId": "rocketchat",
  "applicationName": "Rocket.Chat"
}
```

### Approve Access Request (Admin)

```bash
POST /api/access-requests/:id/approve
Content-Type: application/json

{
  "processedBy": "admin@example.com"
}
```

### Reject Access Request (Admin)

```bash
POST /api/access-requests/:id/reject
Content-Type: application/json

{
  "processedBy": "admin@example.com",
  "notes": "Optional rejection reason"
}
```

## Verification

After applying the schema, verify the table was created:

```sql
-- List all tables
\dt

-- Describe access_requests table
\d access_requests

-- Check if indexes were created
\di
```

## Troubleshooting

### Connection Issues

If you get connection errors, verify:

1. PostgreSQL is running: `systemctl status postgresql` (Linux) or `brew services list` (macOS)
2. Database exists: `psql -U postgres -l`
3. User has permissions: Connect as superuser and run `\du` to list users
4. Configuration is correct: Check `config/database.json`

### Permission Issues

If you get permission errors when creating tables:

```sql
-- Connect to the database as superuser
\c cubel_cloud

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO cubel_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO cubel_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO cubel_user;
```

### Testing the Connection

Use the database health endpoint:

```bash
curl http://localhost:3001/api/database/health
```

Expected response when healthy:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T12:34:56.789Z",
  "version": "PostgreSQL 15.4 on x86_64-pc-linux-gnu..."
}
```

## Backup and Restore

### Backup

```bash
pg_dump -U cubel_user cubel_cloud > backup.sql
```

### Restore

```bash
psql -U cubel_user -d cubel_cloud < backup.sql
```
