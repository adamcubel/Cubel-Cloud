const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const db = require("./database.cjs");

const app = express();
const port = process.env.OIDC_SERVER_PORT || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (for OAuth token requests)

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error("[Server] Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

function loadConfigSafely(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf8");
      return JSON.parse(fileContent);
    }
    console.warn(`[Config] File not found: ${filePath}`);
    return null;
  } catch (error) {
    console.error(
      `[Config] Error loading config from ${filePath}:`,
      error.message,
    );
    return null;
  }
}

app.get("/api/oidc/config", (req, res) => {
  const configPath = path.join(__dirname, "../config/oidc.json");
  const config = loadConfigSafely(configPath);

  if (!config) {
    return res.status(404).json({
      error: "OIDC configuration not found",
      message: "Please create config/oidc.json from config/oidc.example.json",
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
    customQueryParams: config.customQueryParams,
  };

  res.json(publicConfig);
});

app.post("/api/oidc/token", async (req, res) => {
  const configPath = path.join(__dirname, "../config/oidc.json");
  const config = loadConfigSafely(configPath);

  if (!config || !config.clientSecret) {
    return res.status(500).json({
      error: "OIDC configuration not complete",
      message: "Server configuration error - missing client secret",
    });
  }

  const { code, redirect_uri, code_verifier } = req.body;

  if (!code) {
    return res.status(400).json({
      error: "Missing required parameters",
      message: "Authorization code is required",
    });
  }

  console.log("[OIDC Server] Token exchange request received");
  console.log("[OIDC Server] Code:", code.substring(0, 20) + "...");
  console.log("[OIDC Server] Redirect URI:", redirect_uri);

  try {
    // Construct the token endpoint URL from the issuer
    const tokenEndpoint = `${config.issuer}/protocol/openid-connect/token`;

    // Prepare the request body for token exchange
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirect_uri || config.redirectUri);
    params.append("client_id", config.clientId);
    params.append("client_secret", config.clientSecret);

    // Include code_verifier if PKCE is being used
    if (code_verifier) {
      params.append("code_verifier", code_verifier);
    }

    console.log("[OIDC Server] Exchanging code with:", tokenEndpoint);

    // Make the token exchange request
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[OIDC Server] Token exchange failed:", data);
      return res.status(response.status).json({
        error: data.error || "token_exchange_failed",
        error_description:
          data.error_description ||
          "Failed to exchange authorization code for tokens",
      });
    }

    console.log("[OIDC Server] Token exchange successful");

    // Return the tokens to the frontend
    res.json({
      access_token: data.access_token,
      id_token: data.id_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type || "Bearer",
      expires_in: data.expires_in,
      scope: data.scope,
    });
  } catch (error) {
    console.error("[OIDC Server] Token exchange error:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error during token exchange",
      details: error.message,
    });
  }
});

app.get("/api/applications/config", (req, res) => {
  const configPath = path.join(__dirname, "../config/applications.json");
  const config = loadConfigSafely(configPath);

  if (!config) {
    return res.status(404).json({
      error: "Application registry configuration not found",
      message:
        "Please create config/applications.json from config/applications.example.json",
    });
  }

  // Validate that applications array exists
  if (!config.applications || !Array.isArray(config.applications)) {
    return res.status(500).json({
      error: "Invalid application registry configuration",
      message: "Configuration must contain an 'applications' array",
    });
  }

  res.json(config);
});

app.get("/api/gravatar/config", (req, res) => {
  const apiKeyPath = path.join(__dirname, "../config/gravatar-api-key");

  try {
    if (fs.existsSync(apiKeyPath)) {
      const apiKey = fs.readFileSync(apiKeyPath, "utf8").trim();

      if (!apiKey) {
        return res.status(404).json({
          error: "Gravatar API key is empty",
          message: "Please add your API key to config/gravatar-api-key",
        });
      }

      // Check for ENABLE_GRAVATAR_LOGGING environment variable
      const enableLogging = process.env.ENABLE_GRAVATAR_LOGGING === "true";

      res.json({
        apiKey,
        enableLogging,
      });
    } else {
      res.status(404).json({
        error: "Gravatar API key not found",
        message:
          "Please create config/gravatar-api-key and add your Gravatar API key",
      });
    }
  } catch (error) {
    console.error("Error loading Gravatar API key:", error.message);
    res.status(500).json({
      error: "Failed to load Gravatar API key",
      message: error.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Access Request API endpoints

// Get all access requests (admin only)
app.get("/api/access-requests", async (req, res) => {
  if (!db.isAvailable()) {
    return res.status(503).json({
      error: "Database not configured",
      message: "Please configure database connection",
    });
  }

  try {
    const result = await db.query(
      `SELECT id, user_id, user_email, user_name, application_id, application_name,
              status, requested_at, processed_at, processed_by, notes
       FROM access_requests
       ORDER BY
         CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
         requested_at DESC`,
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error("[API] Failed to fetch access requests:", error);
    res.status(500).json({
      error: "Failed to fetch access requests",
      message: error.message,
    });
  }
});

// Create a new access request
app.post("/api/access-requests", async (req, res) => {
  if (!db.isAvailable()) {
    return res.status(503).json({
      error: "Database not configured",
      message: "Please configure database connection",
    });
  }

  const { userId, userEmail, userName, applicationId, applicationName } =
    req.body;

  if (
    !userId ||
    !userEmail ||
    !userName ||
    !applicationId ||
    !applicationName
  ) {
    return res.status(400).json({
      error: "Missing required fields",
      message:
        "userId, userEmail, userName, applicationId, and applicationName are required",
    });
  }

  try {
    // Check if request already exists
    const existingResult = await db.query(
      `SELECT id, status FROM access_requests
       WHERE user_id = $1 AND application_id = $2 AND status = 'pending'`,
      [userId, applicationId],
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: "Request already exists",
        message: "You already have a pending request for this application",
      });
    }

    const result = await db.query(
      `INSERT INTO access_requests (user_id, user_email, user_name, application_id, application_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, user_email, user_name, application_id, application_name,
                 status, requested_at`,
      [userId, userEmail, userName, applicationId, applicationName],
    );

    res.status(201).json({ request: result.rows[0] });
  } catch (error) {
    console.error("[API] Failed to create access request:", error);
    res.status(500).json({
      error: "Failed to create access request",
      message: error.message,
    });
  }
});

// Approve an access request (admin only)
app.post("/api/access-requests/:id/approve", async (req, res) => {
  if (!db.isAvailable()) {
    return res.status(503).json({
      error: "Database not configured",
      message: "Please configure database connection",
    });
  }

  const { id } = req.params;
  const { processedBy } = req.body;

  if (!processedBy) {
    return res.status(400).json({
      error: "Missing required field",
      message: "processedBy is required",
    });
  }

  try {
    const result = await db.query(
      `UPDATE access_requests
       SET status = 'approved', processed_at = NOW(), processed_by = $1
       WHERE id = $2 AND status = 'pending'
       RETURNING id, user_id, user_email, user_name, application_id, application_name,
                 status, requested_at, processed_at, processed_by`,
      [processedBy, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Request not found",
        message: "Access request not found or already processed",
      });
    }

    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error("[API] Failed to approve access request:", error);
    res.status(500).json({
      error: "Failed to approve access request",
      message: error.message,
    });
  }
});

// Reject an access request (admin only)
app.post("/api/access-requests/:id/reject", async (req, res) => {
  if (!db.isAvailable()) {
    return res.status(503).json({
      error: "Database not configured",
      message: "Please configure database connection",
    });
  }

  const { id } = req.params;
  const { processedBy, notes } = req.body;

  if (!processedBy) {
    return res.status(400).json({
      error: "Missing required field",
      message: "processedBy is required",
    });
  }

  try {
    const result = await db.query(
      `UPDATE access_requests
       SET status = 'rejected', processed_at = NOW(), processed_by = $1, notes = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING id, user_id, user_email, user_name, application_id, application_name,
                 status, requested_at, processed_at, processed_by, notes`,
      [processedBy, notes || null, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Request not found",
        message: "Access request not found or already processed",
      });
    }

    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error("[API] Failed to reject access request:", error);
    res.status(500).json({
      error: "Failed to reject access request",
      message: error.message,
    });
  }
});

// Database API endpoints
app.get("/api/database/health", async (req, res) => {
  if (!db.isAvailable()) {
    return res.status(503).json({
      status: "unavailable",
      message: "Database not configured or connection failed",
    });
  }

  try {
    const result = await db.query("SELECT NOW() as now, version() as version");
    res.json({
      status: "healthy",
      timestamp: result.rows[0].now,
      version: result.rows[0].version,
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

// Example: Execute a query (protected endpoint - you should add authentication)
app.post("/api/database/query", async (req, res) => {
  if (!db.isAvailable()) {
    return res.status(503).json({
      error: "Database not configured",
      message:
        "Please create config/database.json from config/database.example.json",
    });
  }

  const { query, params } = req.body;

  if (!query) {
    return res.status(400).json({
      error: "Missing required parameter",
      message: "Query text is required",
    });
  }

  try {
    const result = await db.query(query, params || []);
    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields.map((f) => ({
        name: f.name,
        dataTypeID: f.dataTypeID,
      })),
    });
  } catch (error) {
    console.error("[API] Database query error:", error);
    res.status(500).json({
      error: "Query execution failed",
      message: error.message,
    });
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  await db.closePool();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  await db.closePool();
  process.exit(0);
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize database connection
    console.log("[Server] Initializing database connection...");
    db.initializePool();

    // Initialize database schema if database is available
    if (db.isAvailable()) {
      console.log("[Server] Database available, initializing schema...");
      await db.initializeSchema();
    } else {
      console.warn(
        "[Server] Database not configured - database features will be unavailable",
      );
    }

    // Start the Express server
    app.listen(port, () => {
      console.log(`[Server] OIDC configuration server running on port ${port}`);
      console.log(
        `[Server] Health check available at http://localhost:${port}/health`,
      );
      if (db.isAvailable()) {
        console.log(
          `[Server] Database health check available at http://localhost:${port}/api/database/health`,
        );
      }
      console.log("[Server] Server initialization complete");
    });
  } catch (error) {
    console.error("[Server] Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
