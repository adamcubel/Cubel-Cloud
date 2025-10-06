# Cubel Cloud

A modern, secure application portal demonstrating **Zero-Trust Architecture (ZTA)**, **Identity, Credential, and Access Management (ICAM)**, and **Attribute-Based Access Control (ABAC)** principles.

Built with Angular 20, Node.js/Express, PostgreSQL, and Keycloak for enterprise-grade authentication and authorization.

## Features

### Security & Authentication

- **Keycloak OIDC Integration** - Enterprise SSO with OpenID Connect
- **Zero-Trust Architecture** - Verify explicitly, use least privilege access
- **Automated User Provisioning** - Create users with required actions and group assignments
- **Group-Based Access Control** - Dynamic authorization via Keycloak groups

### User Management

- **Self-Service Registration** - Users request access with approval workflow
- **Application Access Requests** - Users can request access to specific applications
- **Admin Dashboard** - Manage registration and access requests
- **Automatic Group Assignment** - Users added to Keycloak groups on approval

### Modern UI/UX

- **Responsive Design** - TailwindCSS with dark mode support
- **Real-Time Updates** - Reactive state management with Angular signals
- **Gravatar Integration** - Automatic avatar support with fallback
- **Accessible Interface** - WCAG compliant components

### Database

- **PostgreSQL Backend** - Structured data with schema migrations
- **Automatic Schema Initialization** - Tables created on first startup
- **Connection Pooling** - Optimized database performance
- **Transaction Support** - ACID compliance for critical operations

## Architecture

```
==================================================================
|                   Angular Frontend (Port 80)                   |
|   - Applications Dashboard                                     |
|   - User Management                                            |
|   - Registration Forms                                         |
==================================================================


==================================================================
|                  Express Backend API (Port 3001)               |
|   - OIDC Configuration Endpoints                               |
|   - Registration Request Management                            |
|   - Access Request Management                                  |
|   - Keycloak Admin API Integration                             |
==================================================================


==================================================================
|    PostgreSQL                             Keycloak             |
|    - Users                                - Authentication     |
|    - Requests                             - Authorization      |
|    - Audit Trail                          - Group Management   |
==================================================================
```

## Prerequisites

- **Node.js** 20+ LTS
- **PostgreSQL** 12+
- **Keycloak** 21+
- **npm** or **pnpm**

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/cubel-cloud.git
cd cubel-cloud
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Database

Create a PostgreSQL database and copy the example configuration:

```bash
cp config/database.example.json config/database.json
```

Edit `config/database.json`:

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "cubel_cloud",
  "user": "cubel_user",
  "password": "your_secure_password",
  "ssl": false,
  "max": 20,
  "idleTimeoutMillis": 30000,
  "connectionTimeoutMillis": 2000
}
```

The database schema will be automatically initialized on first startup.

### 4. Configure Keycloak OIDC

Copy the example OIDC configuration:

```bash
cp config/oidc.example.json config/oidc.json
```

Edit `config/oidc.json` with your Keycloak details:

```json
{
  "issuer": "https://your-keycloak-domain/realms/your-realm",
  "clientId": "cubel-cloud",
  "clientSecret": "your-client-secret",
  "redirectUri": "http://localhost:3000/auth/callback",
  "responseType": "code",
  "scope": "openid profile email",
  "requireHttps": true,
  "showDebugInformation": false,
  "strictDiscoveryDocumentValidation": true,
  "skipIssuerCheck": false,
  "disablePKCE": false,
  "clearHashAfterLogin": true,
  "postLogoutRedirectUri": "http://localhost:3000",
  "customQueryParams": {}
}
```

#### Keycloak Client Setup

1. Create a new client in Keycloak with client ID `cubel-cloud`
2. Set **Client Protocol**: `openid-connect`
3. Set **Access Type**: `confidential`
4. Set **Valid Redirect URIs**: `http://localhost:3000/*`
5. Enable **Service Accounts** and assign these roles:
   - `view-users`
   - `manage-users`
   - `query-users`
   - `query-groups`

#### Group Structure

Create the following group hierarchy in Keycloak:

```
/apps
    /nextcloud
    /ai
    /rocketchat
    /jitsi
```

Group names under `/apps/` must match the application IDs in your configuration.

### 5. Configure Applications

Copy the example applications configuration:

```bash
cp config/applications.example.json config/applications.json
```

Edit `config/applications.json` to define your applications:

```json
{
  "applications": [
    {
      "id": "nextcloud",
      "name": "Nextcloud",
      "description": "File sharing and collaboration platform",
      "icon": "assets/nextcloud.svg",
      "url": "https://nextcloud.example.com"
    }
  ]
}
```

**Important**: The `id` field must match the Keycloak group name under `/apps/`.

### 6. Configure Gravatar (Optional)

For enhanced avatar support:

```bash
echo "your-gravatar-api-key" > config/gravatar-api-key
```

### 7. Start Development Server

Run both frontend and backend concurrently:

```bash
npm run dev:full
```

Or run them separately:

```bash
# Terminal 1 - Backend API
npm run server

# Terminal 2 - Frontend
npm run dev
```

Access the application at **http://localhost:3000**

## Production Deployment

### Docker

Build and run with Docker:

```bash
# Build the image
docker build -t cubel-cloud .

# Run the container
docker run -d \
  -p 80:80 \
  -p 3001:3001 \
  -v $(pwd)/config:/app/config:ro \
  --name cubel-cloud \
  cubel-cloud
```

### Docker Compose

```bash
# Production mode
docker-compose up cubel-cloud

# Development mode
docker-compose --profile dev up cubel-cloud-dev
```

### Manual Build

```bash
# Build the Angular application
npm run build

# Start the production server
NODE_ENV=production npm run server

# Serve the built files with nginx or another web server
```

## API Endpoints

### OIDC Configuration

- `GET /api/oidc/config` - Public OIDC configuration
- `POST /api/oidc/token` - Token exchange endpoint

### Applications

- `GET /api/applications/config` - Application registry

### Registration Requests

- `GET /api/registration-requests` - List all requests (admin)
- `POST /api/registration-requests` - Create new request
- `POST /api/registration-requests/:id/approve` - Approve request (admin)
- `POST /api/registration-requests/:id/reject` - Reject request (admin)

### Access Requests

- `GET /api/access-requests` - List all requests (admin)
- `POST /api/access-requests` - Request application access
- `POST /api/access-requests/:id/approve` - Approve and add to Keycloak group (admin)
- `POST /api/access-requests/:id/reject` - Reject request (admin)

### Health Checks

- `GET /health` - API health status
- `GET /api/database/health` - Database connectivity check
- `GET /api/gravatar/config` - Gravatar configuration status

## Database Schema

The application automatically creates these tables on first startup:

### `registration_requests`

Stores user registration requests with approval workflow:

- User information (email, first/last name)
- Request reason
- Status (pending/approved/rejected)
- Approval audit trail

### `access_requests`

Tracks application access requests:

- User identification (from OIDC)
- Requested application
- Status and timestamps
- Admin approval tracking

## User Workflows

### New User Registration

1. User visits application and clicks "Get Started"
2. Fills out registration form with justification
3. Request stored in database as `pending`
4. Admin reviews in User Management dashboard
5. On approval:
   - User created in Keycloak with required actions
   - Password reset email sent
   - User added to default groups
6. User receives email to set password and verify account

### Application Access Request

1. User logs in and views applications dashboard
2. Restricted applications show "Request Access" button
3. User clicks button to request access
4. Request stored with status `pending`
5. Admin reviews in Access Requests tab
6. On approval:
   - User automatically added to Keycloak group `/apps/{applicationId}`
   - Database updated to `approved`
7. User gains immediate access to the application

## CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/build.yaml`) that:

### On Pull Requests:

- Validates PR title contains version tag (`[major]`, `[minor]`, or `[patch]`)
- Runs pre-commit checks
- Builds Docker image
- Tests container startup and health endpoints

### On Merge to Main:

- Calculates semantic version from PR title
- Creates git tag
- Creates GitHub release with notes
- Builds and pushes Docker images with three tags:
  - `latest`
  - `v1.2.3` (semantic version)
  - `v1.2.3-20250106-abc1234` (full build ID)
- Tests published image

## Development

### Project Structure

```
cubel-cloud/
  src/                   # Angular frontend
    components/          # UI components
    services/            # API and state services
    models/              # TypeScript interfaces
    guards/              # Route guards
  server/                # Express backend
    oidc-server.cjs      # Main API server
    database.cjs         # PostgreSQL connection pool
    keycloak.cjs         # Keycloak Admin API client
  database/              # Database schemas
    schema.sql           # PostgreSQL DDL
  config/                # Configuration files
    *.example.json       # Example configurations
    *.json               # Actual configs (gitignored)
  .github/workflows/     # CI/CD pipelines
```

### Scripts

```bash
npm run dev              # Start Angular dev server (port 3000)
npm run server           # Start Express API server (port 3001)
npm run dev:full         # Run both concurrently
npm run build            # Build Angular for production
npm run preview          # Preview production build
```

### Environment Variables

- `NODE_ENV` - Environment mode (`development` | `production`)
- `OIDC_SERVER_PORT` - API server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)
- `ENABLE_GRAVATAR_LOGGING` - Enable Gravatar API logging (default: false)

## Security Considerations

### Important Security Notes

1. **Never commit secrets** - All `config/*.json` files (except examples) are gitignored
2. **Use strong passwords** - Database and Keycloak credentials should be randomly generated
3. **Enable HTTPS in production** - Set `requireHttps: true` in OIDC config
4. **Restrict admin access** - Use Keycloak roles to limit admin dashboard access
5. **Review audit logs** - All approvals/rejections are tracked with timestamps and admin email
6. **Secure the database** - Use SSL connections and limit network access
7. **Regular updates** - Keep dependencies updated for security patches

## Troubleshooting

### Database Connection Issues

Check the logs for:

```
[Database] Connection test successful
[Database] Schema initialized
```

Common issues:

- Database doesn't exist - create it manually first
- User lacks privileges - grant CREATE, INSERT, UPDATE, SELECT
- Wrong credentials - verify `config/database.json`

### Keycloak Group Assignment Fails

Enable detailed logging to see which groups exist:

```
[Keycloak] Fetched top-level groups from Keycloak: [...]
[Keycloak] Subgroups for apps: [...]
```

Verify:

- Groups exist in Keycloak with exact naming
- Client has `manage-users` role
- Group path matches application ID

### Schema Not Initialized

The schema file is split and executed statement-by-statement. Check logs for:

```
[Database] Executing 15 SQL statements...
[Database] Statement 1/15: CREATE TABLE...
```

If statements fail, check PostgreSQL privileges.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes with semantic prefix (`[patch]`, `[minor]`, `[major]`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request with version tag in title

Example PR titles:

- `[patch] Fix navigation bug`
- `[minor] Add user profile feature`
- `[major] Breaking change: New authentication system`

## License

This project is licensed under the MIT License - see the [LICENSE](/LICENSE) file for details.

## Acknowledgments

- Angular team for the excellent framework
- Keycloak for enterprise ICAM/ABAC
- TailwindCSS for utility-first styling
- PostgreSQL for reliable data storage
