# Configuration Files

This directory contains runtime configuration files for Cubel Cloud.

## Application Registry Configuration

### File: `applications.json`

Define the applications shown in the portal using a JSON configuration file.

#### Setup

1. Copy the example file:

   ```bash
   cp applications.example.json applications.json
   ```

2. Edit `applications.json` to customize your applications:
   ```json
   {
     "applications": [
       {
         "id": "unique-app-id",
         "name": "Application Name",
         "description": "Application description shown to users",
         "icon": "SVG path data for the icon",
         "url": "https://app.example.com or #/route"
       }
     ]
   }
   ```

#### Application Object Properties

- **id** (string, required): Unique identifier for the application. Used for matching with OIDC token claims.
- **name** (string, required): Display name of the application.
- **description** (string, required): Brief description shown in the application card.
- **icon** (string, required): Application icon. Two formats are supported:
  - **SVG file path**: Path to an SVG file in the assets directory (e.g., `"assets/kubernetes.svg"`)
  - **SVG path data**: Inline SVG path element data (e.g., `"M12 2L2 7..."`)
- **url** (string, required): URL to navigate to when clicking the application. Can be:
  - External URL: `https://example.com`
  - Internal route: `#/route-name`

#### Icon Examples

**Using SVG files from assets (recommended):**

```json
{
  "id": "kubernetes",
  "name": "Kubernetes",
  "description": "Container orchestration platform",
  "icon": "assets/kubernetes.svg",
  "url": "https://k8s.example.com"
}
```

Available SVG files in assets directory:

- `assets/kubernetes.svg`
- `assets/grafana.svg`
- `assets/gitlab.svg`
- `assets/vault.svg`
- `assets/prometheus.svg`
- `assets/keycloak.svg`
- `assets/docker.svg`
- `assets/helm.svg`
- `assets/istio.svg`
- And many more (see `/assets` directory)

**Using inline SVG path data:**

```json
{
  "id": "custom-app",
  "name": "Custom App",
  "description": "Custom application",
  "icon": "M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z",
  "url": "https://custom.example.com"
}
```

#### Docker Configuration

The `applications.json` file is mounted into the container at runtime:

```yaml
volumes:
  - ./config/applications.json:/app/config/applications.json:ro
```

To update the configuration:

1. Edit your local `config/applications.json`
2. Restart the container: `docker-compose restart`

#### Fallback Behavior

If `applications.json` is not found or cannot be loaded:

- The application will use the default built-in application registry
- A warning will be logged in the console
- No disruption to service

#### Integration with OIDC

Applications can be filtered per-user using the `apps` claim in the OIDC token:

```json
{
  "apps": ["dashboard", "users", "content"]
}
```

The application IDs in the configuration must match the values in the OIDC token's `apps` claim.

## Gravatar API Configuration

### File: `gravatar-api-key`

Configure Gravatar API for enhanced user avatar support.

#### Setup

1. Get your Gravatar API key:
   - Visit [Gravatar API Documentation](https://docs.gravatar.com/rest/getting-started/)
   - Create an API key in your Gravatar account
   - Follow the [LLM guide](https://docs.gravatar.com/guides/llms-txt/) for detailed instructions

2. Create the API key file:

   ```bash
   cp gravatar-api-key.example gravatar-api-key
   ```

3. Add your API key:
   ```bash
   echo "your-api-key-here" > gravatar-api-key
   ```

#### Features

When configured, the Gravatar API provides:

- **Real profile photos** from Gravatar.com
- **User profile information** (display name, location, etc.)
- **Verified accounts** (social media links)
- **Professional avatars** instead of generated identicons

#### Fallback Behavior

If the API key is not configured:

- The application will still work normally
- User avatars will use Gravatar's default identicon generation
- No profile information will be fetched

#### Docker Configuration

The API key file is mounted into the container:

```yaml
volumes:
  - ./config/gravatar-api-key:/app/config/gravatar-api-key:ro
```

The API key is loaded at application startup and cached for the session.

## OIDC Configuration

See [../OIDC-SETUP.md](../OIDC-SETUP.md) for OIDC configuration details.

### File: `oidc.json`

Configure OpenID Connect authentication. See the OIDC setup guide for details.

## Database Configuration

### File: `database.json`

Configure PostgreSQL database connection for the application.

#### Setup

1. Copy the example file:

   ```bash
   cp database.example.json database.json
   ```

2. Edit `database.json` with your PostgreSQL connection details:
   ```json
   {
     "host": "localhost",
     "port": 5432,
     "database": "cubel_cloud",
     "user": "cubel_user",
     "password": "your_secure_password_here",
     "ssl": false,
     "max": 20,
     "idleTimeoutMillis": 30000,
     "connectionTimeoutMillis": 2000
   }
   ```

#### Configuration Properties

- **host** (string, required): PostgreSQL server hostname or IP address
- **port** (number, optional): PostgreSQL server port (default: 5432)
- **database** (string, required): Name of the database to connect to
- **user** (string, required): Database user for authentication
- **password** (string, required): Database password for authentication
- **ssl** (boolean or object, optional): Enable SSL/TLS connection
  - `false`: No SSL (default)
  - `true`: SSL with default settings (rejectUnauthorized: false)
  - `{ rejectUnauthorized: true, ca: '...' }`: Custom SSL configuration
- **max** (number, optional): Maximum number of clients in the connection pool (default: 20)
- **idleTimeoutMillis** (number, optional): Close idle clients after N milliseconds (default: 30000)
- **connectionTimeoutMillis** (number, optional): Connection timeout in milliseconds (default: 2000)

#### Docker Configuration

The `database.json` file is mounted into the container at runtime:

```yaml
volumes:
  - ./config/database.json:/app/config/database.json:ro
```

To update the configuration:

1. Edit your local `config/database.json`
2. Restart the container: `docker-compose restart`

#### Database Health Check

Check database connection status:

```bash
curl http://localhost:3001/api/database/health
```

Response when healthy:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T12:34:56.789Z",
  "version": "PostgreSQL 15.4 on x86_64-pc-linux-gnu..."
}
```

#### Using the Database Connection

The database connection is available via the `/api/database/query` endpoint:

```bash
curl -X POST http://localhost:3001/api/database/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users LIMIT 10"}'
```

**Security Note:** The query endpoint should be protected with authentication in production environments.

#### Connection Pooling

The application uses connection pooling for efficient database access:

- Connections are reused across requests
- Idle connections are automatically closed after the configured timeout
- Maximum pool size prevents resource exhaustion
- Failed connections are automatically retried

#### Fallback Behavior

If `database.json` is not found or contains invalid configuration:

- The application will start normally
- Database endpoints will return `503 Service Unavailable`
- A warning will be logged in the console
- No disruption to non-database features

#### Example PostgreSQL Setup

Create a database and user for the application:

```sql
-- Create database
CREATE DATABASE cubel_cloud;

-- Create user
CREATE USER cubel_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cubel_cloud TO cubel_user;

-- Connect to the database
\c cubel_cloud

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO cubel_user;
```
