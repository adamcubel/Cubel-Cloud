import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { AuthService } from "../../services/auth.service";
import { ApplicationService } from "../../services/application.service";
import { AccessRequestService } from "../../services/access-request.service";
import { Application } from "../../models/application.model";
import { UserRole } from "../../models/user.model";

@Component({
  selector: "app-applications",
  templateUrl: "./applications.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class ApplicationsComponent implements OnInit {
  authService = inject(AuthService);
  applicationService = inject(ApplicationService);
  accessRequestService = inject(AccessRequestService);

  applications = signal<Application[]>([]);
  currentUser = this.authService.currentUser;
  isUnvalidated = signal<boolean>(false);
  requestedApplications = signal<Set<string>>(new Set());

  ngOnInit() {
    const user = this.currentUser();
    if (user) {
      // Check if user has "unvalidated" in their apps list
      if (user.apps && user.apps.includes("unvalidated")) {
        this.isUnvalidated.set(true);
        this.applications.set([]);
      } else {
        // Show all applications with accessibility marked
        const apps = this.applicationService.getAllApplicationsWithAccess(user);
        this.applications.set(apps);

        // Load pending access requests
        this.accessRequestService.loadPendingRequests(user.id);
      }
    }

    // Subscribe to pending requests updates
    this.accessRequestService.pendingRequests$.subscribe((pending) => {
      this.requestedApplications.set(pending);
    });
  }

  /**
   * Request access to an application
   */
  requestAccess(app: Application): void {
    const user = this.currentUser();
    if (!user) return;

    this.accessRequestService
      .createAccessRequest({
        userId: user.id,
        userEmail: user.email || "",
        userName: user.name || user.email || "Unknown User",
        applicationId: app.id,
        applicationName: app.name,
      })
      .subscribe({
        next: (response) => {
          console.log("Access request created:", response);
        },
        error: (err) => {
          console.error("Failed to create access request:", err);
          // TODO: Show error notification to user
        },
      });
  }

  /**
   * Check if access has been requested for an application
   */
  isAccessRequested(applicationId: string): boolean {
    return this.requestedApplications().has(applicationId);
  }

  /**
   * Determines if the icon is a file path (e.g., "assets/kubernetes.svg")
   * or SVG path data (e.g., "M12 2L2 7...")
   */
  isIconFilePath(icon: string): boolean {
    return (
      icon.includes("/") || icon.endsWith(".svg") || icon.startsWith("assets/")
    );
  }

  /**
   * Determines if the URL is an internal route (starts with # or /)
   * or an external URL (starts with http:// or https://)
   */
  isExternalUrl(url: string): boolean {
    return url.startsWith("http://") || url.startsWith("https://");
  }
}
