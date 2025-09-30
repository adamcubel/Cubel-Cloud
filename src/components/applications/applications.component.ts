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

  ngOnInit() {
    const user = this.currentUser();
    if (user) {
      // Use the new getApplicationsForUser which respects the apps claim from OIDC
      const apps = this.applicationService.getApplicationsForUser(user);
      this.applications.set(apps);
    }
  }
}
