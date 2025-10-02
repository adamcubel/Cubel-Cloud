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
