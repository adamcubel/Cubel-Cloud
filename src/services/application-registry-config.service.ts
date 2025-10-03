import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, throwError, timer } from "rxjs";
import { catchError, retry } from "rxjs/operators";
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
        retry({
          count: 5,
          delay: (error, retryCount) => {
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
            console.log(
              `[ApplicationRegistryConfigService] Retrying application config load (attempt ${retryCount}/5) after ${delay}ms...`,
            );
            return timer(delay);
          },
        }),
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
