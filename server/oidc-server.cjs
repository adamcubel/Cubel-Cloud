const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.OIDC_SERVER_PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (for OAuth token requests)

function loadConfigSafely(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    }
    return null;
  } catch (error) {
    console.error(`Error loading config from ${filePath}:`, error.message);
    return null;
  }
}

app.get('/api/oidc/config', (req, res) => {
  const configPath = path.join(__dirname, '../config/oidc.json');
  const config = loadConfigSafely(configPath);

  if (!config) {
    return res.status(404).json({
      error: 'OIDC configuration not found',
      message: 'Please create config/oidc.json from config/oidc.example.json'
    });
  }

  // Return public config only - never expose client secret to frontend
  const publicConfig = {
    issuer: config.issuer,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    responseType: config.responseType,
    scope: config.scope,
    requireHttps: config.requireHttps,
    showDebugInformation: config.showDebugInformation,
    strictDiscoveryDocumentValidation: config.strictDiscoveryDocumentValidation,
    skipIssuerCheck: config.skipIssuerCheck,
    disablePKCE: config.disablePKCE,
    clearHashAfterLogin: config.clearHashAfterLogin,
    postLogoutRedirectUri: config.postLogoutRedirectUri,
    customQueryParams: config.customQueryParams
  };

  res.json(publicConfig);
});

app.post('/api/oidc/token', async (req, res) => {
  const configPath = path.join(__dirname, '../config/oidc.json');
  const config = loadConfigSafely(configPath);

  if (!config || !config.clientSecret) {
    return res.status(500).json({
      error: 'OIDC configuration not complete',
      message: 'Server configuration error - missing client secret'
    });
  }

  const { code, redirect_uri, code_verifier } = req.body;

  if (!code) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'Authorization code is required'
    });
  }

  console.log('[OIDC Server] Token exchange request received');
  console.log('[OIDC Server] Code:', code.substring(0, 20) + '...');
  console.log('[OIDC Server] Redirect URI:', redirect_uri);

  try {
    // Construct the token endpoint URL from the issuer
    const tokenEndpoint = `${config.issuer}/protocol/openid-connect/token`;

    // Prepare the request body for token exchange
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirect_uri || config.redirectUri);
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);

    // Include code_verifier if PKCE is being used
    if (code_verifier) {
      params.append('code_verifier', code_verifier);
    }

    console.log('[OIDC Server] Exchanging code with:', tokenEndpoint);

    // Make the token exchange request
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OIDC Server] Token exchange failed:', data);
      return res.status(response.status).json({
        error: data.error || 'token_exchange_failed',
        error_description: data.error_description || 'Failed to exchange authorization code for tokens'
      });
    }

    console.log('[OIDC Server] Token exchange successful');

    // Return the tokens to the frontend
    res.json({
      access_token: data.access_token,
      id_token: data.id_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type || 'Bearer',
      expires_in: data.expires_in,
      scope: data.scope
    });

  } catch (error) {
    console.error('[OIDC Server] Token exchange error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error during token exchange',
      details: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`OIDC configuration server running on port ${port}`);
  console.log(`Health check available at http://localhost:${port}/health`);
});

module.exports = app;