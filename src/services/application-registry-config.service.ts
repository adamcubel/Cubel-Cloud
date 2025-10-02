import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { ApplicationRegistryConfig } from "../models/application-registry-config.model";

@Injectable({
  providedIn: "root",
})
export class ApplicationRegistryConfigService {
  private config: ApplicationRegistryConfig | null = null;

  constructor(private http: HttpClient) {}

  loadConfig(): Observable<ApplicationRegistryConfig> {
    return this.http
      .get<ApplicationRegistryConfig>("/api/applications/config")
      .pipe(
        catchError((error) => {
          console.error(
            "Failed to load application registry configuration:",
            error,
          );
          return throwError(
            () =>
              new Error(
                "Application registry configuration could not be loaded",
              ),
          );
        }),
      );
  }

  setConfig(config: ApplicationRegistryConfig): void {
    this.config = config;
  }

  getConfig(): ApplicationRegistryConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return (
      this.config !== null &&
      this.config.applications &&
      this.config.applications.length > 0
    );
  }
}
