import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../services/auth.service";
import { ApplicationService } from "../../services/application.service";

interface AccessRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  applicationId: string;
  applicationName: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
}

interface RegistrationRequest {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: Date;
  processed_at?: Date;
  processed_by?: string;
  notes?: string;
}

@Component({
  selector: "app-user-management",
  templateUrl: "./user-management.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class UserManagementComponent implements OnInit {
  authService = inject(AuthService);
  applicationService = inject(ApplicationService);
  http = inject(HttpClient);

  accessRequests = signal<AccessRequest[]>([]);
  registrationRequests = signal<RegistrationRequest[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  activeTab = signal<"registrations" | "access">("registrations");

  ngOnInit() {
    this.loadRegistrationRequests();
    this.loadAccessRequests();
  }

  async loadAccessRequests() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      // TODO: Replace with actual API call
      // Mock data for now
      const mockRequests: AccessRequest[] = [
        {
          id: "1",
          userId: "user-123",
          userEmail: "john.doe@example.com",
          userName: "John Doe",
          applicationId: "rocketchat",
          applicationName: "Rocket.Chat",
          status: "pending",
          requestedAt: new Date("2025-10-01T10:30:00"),
        },
        {
          id: "2",
          userId: "user-456",
          userEmail: "jane.smith@example.com",
          userName: "Jane Smith",
          applicationId: "users",
          applicationName: "User Management",
          status: "pending",
          requestedAt: new Date("2025-10-01T14:20:00"),
        },
      ];

      this.accessRequests.set(mockRequests);
    } catch (error) {
      console.error("Failed to load access requests:", error);
      this.errorMessage.set(
        "Failed to load access requests. Please try again.",
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async approveRequest(request: AccessRequest) {
    try {
      // TODO: API call to approve request
      console.log("Approving request:", request.id);

      // Update the request status locally
      this.accessRequests.update((requests) =>
        requests.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: "approved",
                processedAt: new Date(),
                processedBy: this.authService.currentUser()?.email,
              }
            : r,
        ),
      );
    } catch (error) {
      console.error("Failed to approve request:", error);
      alert("Failed to approve request. Please try again.");
    }
  }

  async rejectRequest(request: AccessRequest) {
    try {
      // TODO: API call to reject request
      console.log("Rejecting request:", request.id);

      // Update the request status locally
      this.accessRequests.update((requests) =>
        requests.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: "rejected",
                processedAt: new Date(),
                processedBy: this.authService.currentUser()?.email,
              }
            : r,
        ),
      );
    } catch (error) {
      console.error("Failed to reject request:", error);
      alert("Failed to reject request. Please try again.");
    }
  }

  getPendingRequests(): AccessRequest[] {
    return this.accessRequests().filter((r) => r.status === "pending");
  }

  getProcessedRequests(): AccessRequest[] {
    return this.accessRequests().filter((r) => r.status !== "pending");
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }

  loadRegistrationRequests() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http
      .get<{ requests: RegistrationRequest[] }>("/api/registration-requests")
      .subscribe({
        next: (response) => {
          this.registrationRequests.set(response.requests);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error("Failed to load registration requests:", error);
          this.errorMessage.set(
            "Failed to load registration requests. Please try again.",
          );
          this.isLoading.set(false);
        },
      });
  }

  async approveRegistration(request: RegistrationRequest) {
    const userEmail = this.authService.currentUser()?.email;
    if (!userEmail) {
      alert("Unable to determine current user");
      return;
    }

    this.http
      .post(`/api/registration-requests/${request.id}/approve`, {
        processedBy: userEmail,
      })
      .subscribe({
        next: () => {
          this.loadRegistrationRequests();
        },
        error: (error) => {
          console.error("Failed to approve registration:", error);
          alert("Failed to approve registration. Please try again.");
        },
      });
  }

  async rejectRegistration(request: RegistrationRequest) {
    const userEmail = this.authService.currentUser()?.email;
    if (!userEmail) {
      alert("Unable to determine current user");
      return;
    }

    const notes = prompt("Rejection reason (optional):");

    this.http
      .post(`/api/registration-requests/${request.id}/reject`, {
        processedBy: userEmail,
        notes: notes || undefined,
      })
      .subscribe({
        next: () => {
          this.loadRegistrationRequests();
        },
        error: (error) => {
          console.error("Failed to reject registration:", error);
          alert("Failed to reject registration. Please try again.");
        },
      });
  }

  getPendingRegistrations(): RegistrationRequest[] {
    return this.registrationRequests().filter((r) => r.status === "pending");
  }

  getProcessedRegistrations(): RegistrationRequest[] {
    return this.registrationRequests().filter((r) => r.status !== "pending");
  }

  setActiveTab(tab: "registrations" | "access") {
    this.activeTab.set(tab);
  }
}
