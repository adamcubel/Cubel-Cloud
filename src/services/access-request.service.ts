import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, BehaviorSubject } from "rxjs";
import { tap } from "rxjs/operators";

export interface AccessRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  application_id: string;
  application_name: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  notes?: string;
}

export interface CreateAccessRequestData {
  userId: string;
  userEmail: string;
  userName: string;
  applicationId: string;
  applicationName: string;
}

@Injectable({
  providedIn: "root",
})
export class AccessRequestService {
  private http = inject(HttpClient);
  private apiUrl = "/api/access-requests";

  // Track pending requests in memory
  private pendingRequestsSubject = new BehaviorSubject<Set<string>>(new Set());
  pendingRequests$ = this.pendingRequestsSubject.asObservable();

  /**
   * Create a new access request
   */
  createAccessRequest(
    data: CreateAccessRequestData,
  ): Observable<{ request: AccessRequest }> {
    return this.http.post<{ request: AccessRequest }>(this.apiUrl, data).pipe(
      tap((response) => {
        // Add to pending requests set
        const pending = this.pendingRequestsSubject.value;
        pending.add(data.applicationId);
        this.pendingRequestsSubject.next(pending);
      }),
    );
  }

  /**
   * Get all access requests (admin only)
   */
  getAllAccessRequests(): Observable<{ requests: AccessRequest[] }> {
    return this.http.get<{ requests: AccessRequest[] }>(this.apiUrl);
  }

  /**
   * Approve an access request (admin only)
   */
  approveAccessRequest(
    requestId: string,
    processedBy: string,
  ): Observable<{ request: AccessRequest }> {
    return this.http.post<{ request: AccessRequest }>(
      `${this.apiUrl}/${requestId}/approve`,
      { processedBy },
    );
  }

  /**
   * Reject an access request (admin only)
   */
  rejectAccessRequest(
    requestId: string,
    processedBy: string,
    notes?: string,
  ): Observable<{ request: AccessRequest }> {
    return this.http.post<{ request: AccessRequest }>(
      `${this.apiUrl}/${requestId}/reject`,
      { processedBy, notes },
    );
  }

  /**
   * Check if an access request has been made for a specific application
   */
  hasRequestedAccess(applicationId: string): boolean {
    return this.pendingRequestsSubject.value.has(applicationId);
  }

  /**
   * Load user's pending access requests on initialization
   */
  loadPendingRequests(userId: string): void {
    this.getAllAccessRequests().subscribe({
      next: (response) => {
        const pending = new Set<string>();
        response.requests
          .filter((req) => req.user_id === userId && req.status === "pending")
          .forEach((req) => pending.add(req.application_id));
        this.pendingRequestsSubject.next(pending);
      },
      error: (err) => {
        console.error("Failed to load pending access requests:", err);
      },
    });
  }
}
