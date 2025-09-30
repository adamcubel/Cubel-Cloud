# OIDC Authentication Setup

This application supports OIDC (OpenID Connect) authentication with Keycloak or any OIDC-compliant identity provider.

## Features

- **Secure Configuration**: OIDC configuration is served from a backend API, client secrets never reach the browser
- **Fallback Authentication**: Mock authentication system for development/demo when OIDC is not configured
- **Docker Support**: Configuration files can be mounted into containers
- **Flexible Routing**: Home and about pages are publicly accessible, authentication is only triggered by user action

## Configuration

### 1. Create OIDC Configuration

Copy the example file and configure it for your identity provider:

```bash
cp config/oidc.example.json config/oidc.json
```

### 2. Configure OIDC Client (config/oidc.json)

```json
{
  "issuer": "https://your-keycloak-domain/realms/your-realm",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret-here",
  "redirectUri": "http://localhost:3000/auth/callback",
  "responseType": "code",
  "scope": "openid profile email",
  "requireHttps": true,
  "showDebugInformation": false,
  "strictDiscoveryDocumentValidation": true,
  "skipIssuerCheck": false,
  "disablePKCE": false,
  "clearHashAfterLogin": true,
  "logoutUrl": "http://localhost:3000/logout",
  "customQueryParams": {
    "audience": "your-api-audience"
  }
}
```

**Important**: Never commit this file to version control. It contains your client secret and is in .gitignore for security.

## Keycloak Setup

### 1. Create a Client

1. In Keycloak Admin Console, go to your realm
2. Navigate to Clients → Create Client
3. Configure:
   - Client type: OpenID Connect
   - Client ID: `cubel-cloud` (or your preferred name)
   - Name: `Cubel Cloud Application`

### 2. Client Settings

In the client settings:

- **Access Type**: Confidential
- **Valid Redirect URIs**:
  - `http://localhost:3000/auth/callback` (development)
  - `https://your-domain.com/auth/callback` (production)
- **Valid Post Logout Redirect URIs**:
  - `http://localhost:3000/` (development)
  - `https://your-domain.com/` (production)
- **Web Origins**:
  - `http://localhost:3000` (development)
  - `https://your-domain.com` (production)

### 3. Get Client Secret

1. Go to Credentials tab
2. Copy the client secret
3. Add it to the `clientSecret` field in `config/oidc.json`

## Development

### Run with OIDC

```bash
# Start both frontend and backend
npm run dev:full

# Or start separately
npm run server  # OIDC config server on port 3001
npm run dev     # Angular app on port 3000
```

### Run without OIDC (Mock Mode)

If no OIDC configuration is found, the application falls back to mock authentication:

```bash
npm run dev
```

## Production Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  cubel-cloud:
    build:
      context: .
      target: production
    ports:
      - "80:80"
      - "3001:3001"
    volumes:
      - ./config/oidc.json:/app/config/oidc.json:ro
    environment:
      - NODE_ENV=production
      - FRONTEND_URL=https://your-domain.com
```

### Manual Docker Build

```bash
# Build the image
docker build -t cubel-cloud .

# Run with config mounted
docker run -p 80:80 -p 3001:3001 \
  -v $(pwd)/config/oidc.json:/app/config/oidc.json:ro \
  cubel-cloud
```

## Security Features

1. **Client Secret Protection**: Client secrets are never exposed to the browser
2. **PKCE Support**: Uses Proof Key for Code Exchange for additional security
3. **Secure Defaults**: HTTPS required by default, strict validation enabled
4. **Configuration Isolation**: OIDC config served via secure API endpoint
5. **Docker Volume Mounting**: Secure configuration injection without rebuilding

## User Experience

- **Public Pages**: Home and About pages are accessible without authentication
- **Protected Routes**: Applications page requires authentication
- **Flexible Login**: Users can login via "Get Started" button on home page or "Login" button in header
- **Fallback Mode**: If OIDC is not configured, users can use mock authentication for development

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your Keycloak client has correct Web Origins configured
2. **Redirect Errors**: Check that redirect URIs match exactly in Keycloak and config
3. **Discovery Document**: Verify issuer URL is correct and accessible
4. **Client Secret**: Ensure client secret is correct and client is set to Confidential

### Debug Mode

Enable debug mode in your OIDC configuration:

```json
{
  "showDebugInformation": true
}
```

This will log additional information to the browser console.