const fs = require("fs");
const path = require("path");

/**
 * Keycloak Admin API client for user provisioning
 */

let cachedConfig = null;
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Load OIDC configuration which contains Keycloak details
 * @returns {Object|null} OIDC configuration or null if not found
 */
function loadOIDCConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(__dirname, "../config/oidc.json");

  try {
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, "utf8");
      cachedConfig = JSON.parse(fileContent);

      // Validate required fields for admin operations
      if (
        !cachedConfig.issuer ||
        !cachedConfig.clientId ||
        !cachedConfig.clientSecret
      ) {
        console.error(
          "[Keycloak] Invalid configuration: missing required fields (issuer, clientId, clientSecret)",
        );
        return null;
      }

      return cachedConfig;
    } else {
      console.warn(
        "[Keycloak] Configuration file not found at config/oidc.json",
      );
      return null;
    }
  } catch (error) {
    console.error("[Keycloak] Error loading configuration:", error.message);
    return null;
  }
}

/**
 * Extract Keycloak base URL and realm from issuer URL
 * @param {string} issuer - The issuer URL (e.g., https://keycloak.example.com/realms/myrealm)
 * @returns {Object} Object containing baseUrl and realm
 */
function parseIssuer(issuer) {
  // issuer format: https://domain/realms/realm-name
  const match = issuer.match(/^(https?:\/\/[^\/]+)\/realms\/([^\/]+)/);
  if (!match) {
    throw new Error("Invalid issuer URL format");
  }

  return {
    baseUrl: match[1],
    realm: match[2],
  };
}

/**
 * Get an admin access token using client credentials grant
 * @returns {Promise<string>} Access token
 */
async function getAdminAccessToken() {
  // Check if we have a valid cached token
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
    console.log("[Keycloak] Using cached access token");
    return tokenCache.accessToken;
  }

  const config = loadOIDCConfig();
  if (!config) {
    throw new Error("Keycloak configuration not available");
  }

  const { baseUrl, realm } = parseIssuer(config.issuer);
  const tokenEndpoint = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;

  console.log("[Keycloak] Requesting admin access token...");

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", config.clientId);
  params.append("client_secret", config.clientSecret);

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to get access token: ${errorData.error_description || errorData.error}`,
      );
    }

    const data = await response.json();

    // Cache the token (subtract 60 seconds for safety margin)
    tokenCache.accessToken = data.access_token;
    tokenCache.expiresAt = Date.now() + (data.expires_in - 60) * 1000;

    console.log("[Keycloak] ✓ Admin access token obtained");
    return data.access_token;
  } catch (error) {
    console.error("[Keycloak] Error getting access token:", error.message);
    throw error;
  }
}

/**
 * Create a new user in Keycloak
 * @param {Object} userData - User data object
 * @param {string} userData.email - User's email address
 * @param {string} userData.firstName - User's first name
 * @param {string} userData.lastName - User's last name
 * @returns {Promise<string>} Created user's ID
 */
async function createUser(userData) {
  const config = loadOIDCConfig();
  if (!config) {
    throw new Error("Keycloak configuration not available");
  }

  const { baseUrl, realm } = parseIssuer(config.issuer);
  const accessToken = await getAdminAccessToken();

  // Prepare user representation
  const userRepresentation = {
    email: userData.email,
    username: userData.email, // Use email as username
    firstName: userData.firstName,
    lastName: userData.lastName,
    enabled: true,
    emailVerified: false, // Will be verified through required action
    requiredActions: [
      "VERIFY_EMAIL",
      "TERMS_AND_CONDITIONS",
      "UPDATE_PASSWORD",
      "webauthn-register",
    ],
    groups: ["/apps/nextcloud", "/apps/ai", "/apps/rocketchat", "/apps/jitsi"],
  };

  const createUserEndpoint = `${baseUrl}/admin/realms/${realm}/users`;

  console.log(`[Keycloak] Creating user: ${userData.email}`);

  try {
    const response = await fetch(createUserEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(userRepresentation),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.errorMessage || errorData.error || errorText;
      } catch {
        errorMessage = errorText;
      }

      // Check for duplicate user
      if (response.status === 409) {
        throw new Error(`User with email ${userData.email} already exists`);
      }

      throw new Error(`Failed to create user: ${errorMessage}`);
    }

    // Extract user ID from Location header
    const locationHeader = response.headers.get("Location");
    if (!locationHeader) {
      throw new Error("User created but ID not returned in Location header");
    }

    const userId = locationHeader.substring(
      locationHeader.lastIndexOf("/") + 1,
    );

    console.log(`[Keycloak] ✓ User created successfully: ${userId}`);
    return userId;
  } catch (error) {
    console.error("[Keycloak] Error creating user:", error.message);
    throw error;
  }
}

/**
 * Check if a user exists in Keycloak by email
 * @param {string} email - User's email address
 * @returns {Promise<Object|null>} User object if found, null otherwise
 */
async function getUserByEmail(email) {
  const config = loadOIDCConfig();
  if (!config) {
    throw new Error("Keycloak configuration not available");
  }

  const { baseUrl, realm } = parseIssuer(config.issuer);
  const accessToken = await getAdminAccessToken();

  const searchEndpoint = `${baseUrl}/admin/realms/${realm}/users?email=${encodeURIComponent(email)}&exact=true`;

  try {
    const response = await fetch(searchEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search for user: ${response.statusText}`);
    }

    const users = await response.json();

    if (users.length === 0) {
      return null;
    }

    return users[0];
  } catch (error) {
    console.error("[Keycloak] Error searching for user:", error.message);
    throw error;
  }
}

/**
 * Send a password reset email to a user
 * @param {string} userId - User's ID in Keycloak
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(userId) {
  const config = loadOIDCConfig();
  if (!config) {
    throw new Error("Keycloak configuration not available");
  }

  const { baseUrl, realm } = parseIssuer(config.issuer);
  const accessToken = await getAdminAccessToken();

  const executeActionsEndpoint = `${baseUrl}/admin/realms/${realm}/users/${userId}/execute-actions-email`;

  console.log(`[Keycloak] Sending password reset email to user: ${userId}`);

  try {
    const response = await fetch(executeActionsEndpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify([
        "VERIFY_EMAIL",
        "TERMS_AND_CONDITIONS",
        "UPDATE_PASSWORD",
        "webauthn-register",
      ]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.errorMessage || errorData.error || errorText;
      } catch {
        errorMessage = errorText;
      }

      throw new Error(`Failed to send password reset email: ${errorMessage}`);
    }

    console.log(`[Keycloak] ✓ Password reset email sent successfully`);
  } catch (error) {
    console.error(
      "[Keycloak] Error sending password reset email:",
      error.message,
    );
    throw error;
  }
}

/**
 * Provision a user account in Keycloak (create if doesn't exist)
 * @param {Object} userData - User data object
 * @param {string} userData.email - User's email address
 * @param {string} userData.firstName - User's first name
 * @param {string} userData.lastName - User's last name
 * @returns {Promise<Object>} Object with userId and status (created|existing)
 */
async function provisionUser(userData) {
  console.log(`[Keycloak] Provisioning user: ${userData.email}`);

  // Check if user already exists
  const existingUser = await getUserByEmail(userData.email);

  if (existingUser) {
    console.log(`[Keycloak] User already exists: ${existingUser.id}`);
    return {
      userId: existingUser.id,
      status: "existing",
      username: existingUser.username,
    };
  }

  // Create new user
  const userId = await createUser(userData);

  // Send password reset email to the newly created user
  try {
    await sendPasswordResetEmail(userId);
  } catch (error) {
    console.error(
      "[Keycloak] Warning: User created but failed to send password reset email:",
      error.message,
    );
    // Don't throw - user was created successfully, email is a nice-to-have
  }

  return {
    userId,
    status: "created",
    username: userData.email,
  };
}

/**
 * Add a user to a Keycloak group
 * @param {string} userId - User's ID in Keycloak
 * @param {string} groupPath - Full group path (e.g., "/apps/nextcloud")
 * @returns {Promise<void>}
 */
async function addUserToGroup(userId, groupPath) {
  const config = loadOIDCConfig();
  if (!config) {
    throw new Error("Keycloak configuration not available");
  }

  const { baseUrl, realm } = parseIssuer(config.issuer);
  const accessToken = await getAdminAccessToken();

  console.log(`[Keycloak] Adding user ${userId} to group: ${groupPath}`);

  try {
    // First, find the group by path
    const groupId = await findGroupByPath(groupPath);

    if (!groupId) {
      throw new Error(`Group not found: ${groupPath}`);
    }

    // Add user to group
    const addToGroupEndpoint = `${baseUrl}/admin/realms/${realm}/users/${userId}/groups/${groupId}`;

    const response = await fetch(addToGroupEndpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.errorMessage || errorData.error || errorText;
      } catch {
        errorMessage = errorText;
      }

      throw new Error(`Failed to add user to group: ${errorMessage}`);
    }

    console.log(`[Keycloak] ✓ User added to group successfully: ${groupPath}`);
  } catch (error) {
    console.error("[Keycloak] Error adding user to group:", error.message);
    throw error;
  }
}

/**
 * Fetch subgroups for a specific group
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} Array of subgroups
 */
async function fetchSubgroups(groupId) {
  const config = loadOIDCConfig();
  if (!config) {
    throw new Error("Keycloak configuration not available");
  }

  const { baseUrl, realm } = parseIssuer(config.issuer);
  const accessToken = await getAdminAccessToken();

  const subgroupsEndpoint = `${baseUrl}/admin/realms/${realm}/groups/${groupId}/children`;

  const response = await fetch(subgroupsEndpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch subgroups for ${groupId}: ${response.statusText}`,
    );
  }

  return await response.json();
}

/**
 * Find a group by its path
 * @param {string} groupPath - Full group path (e.g., "/apps/nextcloud")
 * @returns {Promise<string|null>} Group ID if found, null otherwise
 */
async function findGroupByPath(groupPath) {
  const config = loadOIDCConfig();
  if (!config) {
    throw new Error("Keycloak configuration not available");
  }

  const { baseUrl, realm } = parseIssuer(config.issuer);
  const accessToken = await getAdminAccessToken();

  // Parse the group path (e.g., "/apps/nextcloud" -> ["apps", "nextcloud"])
  const pathParts = groupPath.split("/").filter((p) => p.length > 0);

  if (pathParts.length === 0) {
    throw new Error("Invalid group path");
  }

  try {
    // Get top-level groups
    const groupsEndpoint = `${baseUrl}/admin/realms/${realm}/groups`;

    const response = await fetch(groupsEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch groups: ${response.statusText}`);
    }

    const groups = await response.json();

    // console.log(
    //   "[Keycloak] Fetched top-level groups from Keycloak:",
    //   JSON.stringify(groups, null, 2),
    // );

    // Navigate through the group hierarchy
    let currentGroup = null;
    let groupId = null;

    for (let i = 0; i < pathParts.length; i++) {
      const partName = pathParts[i];
      let searchGroups;

      // First level: search in top-level groups
      if (i === 0) {
        searchGroups = groups;
      } else {
        // Subsequent levels: fetch subgroups from parent
        console.log(
          `[Keycloak] Fetching subgroups for group ID: ${currentGroup.id}`,
        );
        searchGroups = await fetchSubgroups(currentGroup.id);
        // console.log(
        //   `[Keycloak] Subgroups for ${currentGroup.name}:`,
        //   JSON.stringify(searchGroups, null, 2),
        // );
      }

      // Find the group at this level
      const found = searchGroups.find((g) => g.name === partName);

      if (!found) {
        console.warn(
          `[Keycloak] Group not found at path level ${i + 1}: ${partName}`,
        );
        return null;
      }

      currentGroup = found;
      groupId = found.id;

      console.log(
        `[Keycloak] Found group at level ${i + 1}: ${partName} (ID: ${groupId})`,
      );
    }

    return groupId;
  } catch (error) {
    console.error("[Keycloak] Error finding group by path:", error.message);
    throw error;
  }
}

/**
 * Check if Keycloak is configured and available
 * @returns {boolean} True if Keycloak is configured
 */
function isAvailable() {
  const config = loadOIDCConfig();
  return config !== null;
}

module.exports = {
  getAdminAccessToken,
  createUser,
  getUserByEmail,
  sendPasswordResetEmail,
  addUserToGroup,
  fetchSubgroups,
  findGroupByPath,
  provisionUser,
  isAvailable,
};
