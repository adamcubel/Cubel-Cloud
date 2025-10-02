import { Injectable, signal, computed, inject } from "@angular/core";
import { Router } from "@angular/router";
import { OAuthService, AuthConfig } from "angular-oauth2-oidc";
import { filter, firstValueFrom } from "rxjs";
import { User, UserRole } from "../models/user.model";
import { OidcConfigService } from "./oidc-config.service";
import { ApplicationRegistryConfigService } from "./application-registry-config.service";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private router = inject(Router);
  private oauthService = inject(OAuthService);
  private oidcConfigService = inject(OidcConfigService);
  private applicationRegistryConfigService = inject(
    ApplicationRegistryConfigService,
  );

  currentUser = signal<User | null>(null);
  isLoggedIn = computed(() => !!this.currentUser());
  isConfiguring = signal<boolean>(false);
  private initialized = false;

  constructor() {
    this.setupOAuthEvents();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async initializeOAuth(): Promise<void> {
    if (this.initialized) {
      console.log("[AuthService] Already initialized, skipping");
      return;
    }

    this.isConfiguring.set(true);

    try {
      // Load both OIDC config and application registry config in parallel
      const [config, appRegistryConfig] = await Promise.all([
        firstValueFrom(this.oidcConfigService.loadConfig()),
        firstValueFrom(
          this.applicationRegistryConfigService.loadConfig(),
        ).catch((error) => {
          console.warn(
            "Application registry configuration not available, using default:",
            error.message,
          );
          return null;
        }),
      ]);

      // Store application registry config if loaded
      if (appRegistryConfig) {
        this.applicationRegistryConfigService.setConfig(appRegistryConfig);
        console.log(
          "[AuthService] Loaded application registry with",
          appRegistryConfig.applications.length,
          "applications",
        );
      }

      if (!config) {
        console.warn(
          "OIDC configuration not available, using mock authentication",
        );
        this.isConfiguring.set(false);
        this.initialized = true;
        return;
      }

      this.oidcConfigService.setConfig(config);

      // For Authorization Code flow with client secret, we need to use a custom token endpoint
      // that routes through our backend to keep the secret secure
      const useBackendTokenEndpoint =
        config.responseType === "code" && !config.disablePKCE;

      const authConfig: AuthConfig = {
        issuer: config.issuer,
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        responseType: config.responseType,
        scope: config.scope,
        requireHttps: config.requireHttps,
        showDebugInformation: config.showDebugInformation,
        strictDiscoveryDocumentValidation:
          config.strictDiscoveryDocumentValidation,
        skipIssuerCheck: config.skipIssuerCheck,
        disablePKCE: config.disablePKCE,
        clearHashAfterLogin: config.clearHashAfterLogin,
        customQueryParams: config.customQueryParams,
        postLogoutRedirectUri: config.postLogoutRedirectUri,
        oidc: true, // Use OIDC mode
        requestAccessToken: config.responseType === "code", // Request access token for code flow
        // Use backend token endpoint for secure client secret handling
        ...(useBackendTokenEndpoint && {
          tokenEndpoint: `${window.location.origin}/api/oidc/token`,
          useHttpBasicAuth: false, // Don't use Basic Auth, send credentials in body
        }),
      };

      if (config.showDebugInformation) {
        console.log("[AuthService] Configuring OAuth with:", {
          issuer: config.issuer,
          clientId: config.clientId,
          redirectUri: config.redirectUri,
          responseType: config.responseType,
          scope: config.scope,
          tokenEndpoint:
            authConfig.tokenEndpoint || "default (from discovery document)",
          useBackendTokenEndpoint,
        });
      }

      this.oauthService.configure(authConfig);

      if (config.showDebugInformation) {
        console.log("[AuthService] Loading discovery document...");
      }

      // Only load discovery document, don't try to login yet
      // The callback component will handle the login
      await this.oauthService.loadDiscoveryDocument();

      if (config.showDebugInformation) {
        console.log("[AuthService] Discovery document loaded");
      }

      // Override token endpoint after discovery document is loaded
      // This is necessary because the discovery document sets the token endpoint
      // and we need to route it through our backend for client secret security
      if (useBackendTokenEndpoint) {
        (this.oauthService as any).tokenEndpoint =
          `${window.location.origin}/api/oidc/token`;
        if (config.showDebugInformation) {
          console.log(
            "[AuthService] Token endpoint overridden to:",
            `${window.location.origin}/api/oidc/token`,
          );
        }
      }

      this.initialized = true;

      // Check if we already have valid tokens from a previous session
      if (
        this.oauthService.hasValidAccessToken() ||
        this.oauthService.hasValidIdToken()
      ) {
        if (config.showDebugInformation) {
          console.log("[AuthService] Found existing valid tokens");
        }
        this.loadUserProfile();
      }
    } catch (error) {
      console.error("[AuthService] Failed to initialize OAuth:", error);
    } finally {
      this.isConfiguring.set(false);
    }
  }

  async handleAuthCallback(): Promise<void> {
    const config = this.oidcConfigService.getConfig();

    if (config?.showDebugInformation) {
      console.log("[AuthService] Handling auth callback");
      console.log("[AuthService] Current URL:", window.location.href);
      console.log("[AuthService] URL Hash:", window.location.hash);
      console.log("[AuthService] URL Search params:", window.location.search);
    }

    try {
      // Try to login with the tokens in the URL
      const loginResult = await this.oauthService.tryLogin();

      if (config?.showDebugInformation) {
        console.log("[AuthService] tryLogin result:", loginResult);
        console.log(
          "[AuthService] Has valid access token:",
          this.oauthService.hasValidAccessToken(),
        );
        console.log(
          "[AuthService] Has valid ID token:",
          this.oauthService.hasValidIdToken(),
        );

        if (
          this.oauthService.hasValidAccessToken() ||
          this.oauthService.hasValidIdToken()
        ) {
          const accessToken = this.oauthService.getAccessToken();
          const idToken = this.oauthService.getIdToken();

          // Log token info with sensitive data masked
          if (accessToken) {
            console.log(
              "[AuthService] Access Token (first 20 chars):",
              accessToken.substring(0, 20) + "...",
            );
            console.log(
              "[AuthService] Token expiration:",
              new Date(this.oauthService.getAccessTokenExpiration()),
            );
          }
          if (idToken) {
            console.log(
              "[AuthService] ID Token (first 20 chars):",
              idToken.substring(0, 20) + "...",
            );
          }
          console.log(
            "[AuthService] Identity Claims:",
            this.sanitizeClaims(this.oauthService.getIdentityClaims()),
          );
        } else {
          console.warn("[AuthService] No valid tokens found after callback");
          console.log(
            "[AuthService] LocalStorage keys:",
            Object.keys(localStorage),
          );
          console.log(
            "[AuthService] SessionStorage keys:",
            Object.keys(sessionStorage),
          );
        }
      }

      if (
        this.oauthService.hasValidAccessToken() ||
        this.oauthService.hasValidIdToken()
      ) {
        this.loadUserProfile();
      }
    } catch (error) {
      console.error("[AuthService] Error handling auth callback:", error);
      throw error;
    }
  }

  login(): void {
    if (this.oidcConfigService.isConfigured()) {
      this.oauthService.initLoginFlow();
    } else {
      console.warn("OIDC not configured, redirecting to mock login");
      this.router.navigate(["/login"]);
    }
  }

  logout(): void {
    if (this.oidcConfigService.isConfigured()) {
      this.oauthService.logOut();
    }
    this.currentUser.set(null);
    this.router.navigate(["/home"]);
  }

  mockLogin(role: UserRole): void {
    const mockUsers: Record<UserRole, User> = {
      admin: {
        id: "1",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
      },
      user: {
        id: "2",
        name: "Standard User",
        email: "user@example.com",
        role: "user",
      },
      guest: {
        id: "3",
        name: "Guest User",
        email: "guest@example.com",
        role: "guest",
      },
    };

    const user = mockUsers[role];
    if (user) {
      this.currentUser.set(user);
      this.router.navigate(["/applications"]);
    }
  }

  private setupOAuthEvents(): void {
    // Log all OAuth events when debug mode is enabled
    this.oauthService.events.subscribe((event) => {
      const config = this.oidcConfigService.getConfig();
      if (config?.showDebugInformation) {
        console.log("[AuthService] OAuth Event:", event.type, event);
      }
    });

    this.oauthService.events
      .pipe(filter((e) => e.type === "token_received"))
      .subscribe(() => {
        const config = this.oidcConfigService.getConfig();
        if (config?.showDebugInformation) {
          console.log(
            "[AuthService] Token received event - loading user profile",
          );
        }
        this.loadUserProfile();
      });

    this.oauthService.events
      .pipe(filter((e) => e.type === "logout"))
      .subscribe(() => {
        const config = this.oidcConfigService.getConfig();
        if (config?.showDebugInformation) {
          console.log("[AuthService] Logout event received");
        }
        this.currentUser.set(null);
        this.router.navigate(["/home"]);
      });
  }

  private loadUserProfile(): void {
    const claims = this.oauthService.getIdentityClaims();
    const config = this.oidcConfigService.getConfig();

    if (config?.showDebugInformation) {
      console.log(
        "[AuthService] Loading user profile from claims:",
        this.sanitizeClaims(claims),
      );
    }

    if (claims) {
      // Parse apps claim - could be string array or comma-separated string
      let apps: string[] = [];
      if (claims["apps"]) {
        if (Array.isArray(claims["apps"])) {
          apps = claims["apps"];
        } else if (typeof claims["apps"] === "string") {
          apps = claims["apps"]
            .split(",")
            .map((app) => app.trim())
            .filter((app) => app);
        }
      }

      const user: User = {
        id: claims["sub"] || "unknown",
        name: claims["name"] || claims["preferred_username"] || "Unknown User",
        email: claims["email"] || "unknown@example.com",
        role: this.determineUserRole(claims),
        apps: apps.length > 0 ? apps : undefined,
      };

      if (config?.showDebugInformation) {
        console.log("[AuthService] User profile created:", user);
        console.log("[AuthService] Apps from token:", apps);
        console.log("[AuthService] Setting currentUser signal");
      }

      this.currentUser.set(user);

      if (config?.showDebugInformation) {
        console.log(
          "[AuthService] Current user after set:",
          this.currentUser(),
        );
        console.log("[AuthService] Is logged in:", this.isLoggedIn());
      }
    } else if (config?.showDebugInformation) {
      console.warn("[AuthService] No identity claims available");
    }
  }

  private determineUserRole(claims: any): UserRole {
    const roles = claims["realm_access"]?.roles || claims["roles"] || [];

    if (roles.includes("admin") || roles.includes("realm-admin")) {
      return "admin";
    } else if (roles.includes("user")) {
      return "user";
    }

    return "guest";
  }

  getGravatarUrl(email: string, size: number = 40): string {
    const hash = this.md5(email.toLowerCase().trim());
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=pg`;
  }

  private md5(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  private sanitizeClaims(claims: any): any {
    if (!claims) return null;

    const sanitized = { ...claims };

    // Remove or mask sensitive fields
    const sensitiveFields = ["sub", "aud", "iss", "jti", "sid"];
    sensitiveFields.forEach((field) => {
      if (sanitized[field] && typeof sanitized[field] === "string") {
        sanitized[field] = sanitized[field].substring(0, 8) + "...";
      }
    });

    return sanitized;
  }
}
