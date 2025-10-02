import { Injectable } from "@angular/core";
import { Application } from "../models/application.model";
import { User, UserRole } from "../models/user.model";
import { ApplicationRegistryConfigService } from "./application-registry-config.service";

// Default/fallback application registry
const DEFAULT_APPLICATION_REGISTRY: Record<string, Application> = {
  rocketchat: {
    id: "rocketchat",
    name: "Rocket.Chat",
    description: "Team collaboration and messaging platform.",
    icon: "M12.5 2C6.7 2 2 6.7 2 12.5S6.7 23 12.5 23 23 18.3 23 12.5 18.3 2 12.5 2zm4.7 14.9c-1.2.8-2.6 1.3-4.2 1.3-4.4 0-7.9-3.5-7.9-7.9S8.6 2.4 13 2.4c2.9 0 5.5 1.6 6.8 4l-2.5 1.4c-.8-1.5-2.4-2.5-4.3-2.5-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9c1.4 0 2.6-.6 3.5-1.5l2.4 1.4z",
    url: "https://chat.cubel.org",
  },
  dashboard: {
    id: "dashboard",
    name: "Dashboard Analytics",
    description: "View key performance indicators and business metrics.",
    icon: "M3 13H5V11H3V13ZM3 17H5V15H3V17ZM3 9H5V7H3V9ZM7 13H17V11H7V13ZM7 17H17V15H7V17ZM7 7V9H17V7H7Z",
    url: "#/dashboard",
  },
  users: {
    id: "users",
    name: "User Management",
    description: "Administer user accounts, roles, and permissions.",
    icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    url: "#/users",
  },
  content: {
    id: "content",
    name: "Content Editor",
    description: "Create and manage website content and articles.",
    icon: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    url: "#/content",
  },
  support: {
    id: "support",
    name: "Support Tickets",
    description: "View and respond to customer support inquiries.",
    icon: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 12H5.17L4 15.17V4h16v10z",
    url: "#/support",
  },
};

@Injectable({
  providedIn: "root",
})
export class ApplicationService {
  constructor(
    private applicationRegistryConfigService: ApplicationRegistryConfigService,
  ) {}
  /**
   * Get the application registry (from config or fallback to default)
   */
  private getApplicationRegistry(): Record<string, Application> {
    const config = this.applicationRegistryConfigService.getConfig();
    if (config && config.applications) {
      // Convert array to record for lookup
      return config.applications.reduce(
        (acc, app) => {
          acc[app.id] = app;
          return acc;
        },
        {} as Record<string, Application>,
      );
    }
    return DEFAULT_APPLICATION_REGISTRY;
  }

  /**
   * Get applications for a user based on their apps claim from OIDC token
   * Falls back to role-based filtering if no apps claim is present
   */
  getApplicationsForUser(user: User): Application[] {
    const registry = this.getApplicationRegistry();

    // If user has apps claim, use that
    if (user.apps && user.apps.length > 0) {
      return user.apps
        .map((appId) => registry[appId])
        .filter((app) => app !== undefined);
    }

    // Fallback to role-based filtering
    return this.getApplicationsForRole(user.role);
  }

  /**
   * Legacy method: Get applications based on role
   * @deprecated Use getApplicationsForUser instead
   */
  getApplicationsForRole(role: UserRole): Application[] {
    const allApps = Object.values(this.getApplicationRegistry());

    switch (role) {
      case "admin":
        return allApps;
      case "user":
        return allApps.filter((app) =>
          ["dashboard", "content", "support"].includes(app.id),
        );
      case "guest":
        return allApps.filter((app) => app.id === "dashboard");
      default:
        return [];
    }
  }

  /**
   * Get all available applications in the registry
   */
  getAllApplications(): Application[] {
    return Object.values(this.getApplicationRegistry());
  }
}
