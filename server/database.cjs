const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

let pool = null;

/**
 * Load database configuration from config/database.json
 * @returns {Object|null} Database configuration or null if not found
 */
function loadDatabaseConfig() {
  const configPath = path.join(__dirname, "../config/database.json");

  try {
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, "utf8");
      const config = JSON.parse(fileContent);

      // Validate required fields
      if (!config.host || !config.database || !config.user) {
        console.error(
          "[Database] Invalid configuration: missing required fields (host, database, user)",
        );
        return null;
      }

      return config;
    } else {
      console.warn(
        "[Database] Configuration file not found at config/database.json",
      );
      return null;
    }
  } catch (error) {
    console.error("[Database] Error loading configuration:", error.message);
    return null;
  }
}

/**
 * Initialize PostgreSQL connection pool
 * @returns {Pool|null} PostgreSQL connection pool or null if configuration is invalid
 */
function initializePool() {
  if (pool) {
    return pool;
  }

  const config = loadDatabaseConfig();

  if (!config) {
    return null;
  }

  try {
    pool = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20, // Maximum number of clients in the pool
      idleTimeoutMillis: config.idleTimeoutMillis || 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000, // Return an error after 2 seconds if connection cannot be established
      ssl: config.ssl
        ? typeof config.ssl === "object"
          ? config.ssl
          : { rejectUnauthorized: false }
        : false,
    });

    // Handle pool errors
    pool.on("error", (err) => {
      console.error("[Database] Unexpected error on idle client", err);
    });

    console.log("[Database] Connection pool created");
    console.log(`[Database] Database: ${config.database}`);
    console.log(`[Database] Host: ${config.host}:${config.port || 5432}`);

    return pool;
  } catch (error) {
    console.error("[Database] Failed to initialize pool:", error.message);
    pool = null;
    return null;
  }
}

/**
 * Get the database connection pool
 * @returns {Pool|null} PostgreSQL connection pool or null if not initialized
 */
function getPool() {
  if (!pool) {
    return initializePool();
  }
  return pool;
}

/**
 * Execute a query on the database
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const pool = getPool();

  if (!pool) {
    throw new Error("Database connection not configured");
  }

  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("[Database] Executed query", {
      text,
      duration,
      rows: res.rowCount,
    });
    return res;
  } catch (error) {
    console.error("[Database] Query error:", error.message);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} PostgreSQL client
 */
async function getClient() {
  const pool = getPool();

  if (!pool) {
    throw new Error("Database connection not configured");
  }

  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error(
      "[Database] Client has been checked out for more than 5 seconds!",
    );
    console.error(
      `[Database] The last executed query on this client was: ${client.lastQuery}`,
    );
  }, 5000);

  // Monkey patch the query method to track the last query
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };

  // Monkey patch the release method to clear the timeout
  client.release = () => {
    clearTimeout(timeout);
    // Set the methods back to their old implementations
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
}

/**
 * Close the database connection pool
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("[Database] Connection pool closed");
  }
}

/**
 * Check if database is configured and connected
 * @returns {boolean} True if database is available
 */
function isAvailable() {
  return pool !== null;
}

/**
 * Initialize database schema if tables don't exist
 * @returns {Promise<boolean>} True if schema was initialized successfully
 */
async function initializeSchema() {
  const pool = getPool();

  if (!pool) {
    console.warn(
      "[Database] Cannot initialize schema - database not configured",
    );
    return false;
  }

  try {
    // Test database connection first
    console.log("[Database] Testing database connection...");
    const testResult = await pool.query("SELECT NOW() as now");
    console.log("[Database] ✓ Connection test successful");
    console.log(`[Database] Server time: ${testResult.rows[0].now}`);

    console.log("[Database] Checking if schema initialization is needed...");

    // Check if both registration_requests and access_requests tables exist
    const tableCheckResult = await pool.query(
      `SELECT
        (SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'registration_requests'
        )) as registration_requests_exists,
        (SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'access_requests'
        )) as access_requests_exists`,
    );

    const registrationTableExists =
      tableCheckResult.rows[0].registration_requests_exists;
    const accessTableExists = tableCheckResult.rows[0].access_requests_exists;

    if (registrationTableExists && accessTableExists) {
      console.log("[Database] Schema already initialized - all tables exist");
      return true;
    }

    // Log which tables are missing
    if (!registrationTableExists) {
      console.log("[Database] Missing table: registration_requests");
    }
    if (!accessTableExists) {
      console.log("[Database] Missing table: access_requests");
    }

    console.log("[Database] Initializing/updating database schema...");

    // Read and execute schema file
    const schemaPath = path.join(__dirname, "../database/schema.sql");

    if (!fs.existsSync(schemaPath)) {
      console.error("[Database] Schema file not found at database/schema.sql");
      return false;
    }

    const schemaSQL = fs.readFileSync(schemaPath, "utf8");

    // Execute the schema SQL
    // Split by semicolons and execute each statement separately
    // (pg doesn't support multiple statements in a single query)
    const statements = schemaSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`[Database] Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      try {
        await pool.query(statements[i]);
      } catch (error) {
        console.error(
          `[Database] Error executing statement ${i + 1}:`,
          error.message,
        );
        console.error(
          `[Database] Statement: ${statements[i].substring(0, 100)}...`,
        );
        throw error;
      }
    }

    console.log("[Database] ✓ Schema initialized/updated successfully");
    if (!registrationTableExists) {
      console.log("[Database] ✓ Created table: registration_requests");
    }
    if (!accessTableExists) {
      console.log("[Database] ✓ Created table: access_requests");
    }
    console.log("[Database] ✓ Created/updated indexes");
    console.log("[Database] ✓ Created/updated triggers");

    return true;
  } catch (error) {
    console.error("[Database] Failed to initialize schema:", error.message);
    if (error.code) {
      console.error(`[Database] Error code: ${error.code}`);
    }
    console.error("[Database] This is likely due to:");
    console.error("  - Incorrect database credentials in config/database.json");
    console.error("  - Database server is not running");
    console.error("  - Database does not exist");
    console.error("  - User lacks necessary privileges");
    return false;
  }
}

module.exports = {
  initializePool,
  getPool,
  query,
  getClient,
  closePool,
  isAvailable,
  initializeSchema,
};
