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

  applications = signal<Application[]>([]);
  currentUser = this.authService.currentUser;
  isUnvalidated = signal<boolean>(false);

  ngOnInit() {
    const user = this.currentUser();
    if (user) {
      // Check if user has "unvalidated" in their apps list
      if (user.apps && user.apps.includes("unvalidated")) {
        this.isUnvalidated.set(true);
        this.applications.set([]);
      } else {
        // Use the new getApplicationsForUser which respects the apps claim from OIDC
        const apps = this.applicationService.getApplicationsForUser(user);
        this.applications.set(apps);
      }
    }
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
