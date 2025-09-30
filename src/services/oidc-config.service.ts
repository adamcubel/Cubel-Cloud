import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { OidcPublicConfig } from "../models/oidc-config.model";

@Injectable({
  providedIn: "root",
})
export class OidcConfigService {
  private config: OidcPublicConfig | null = null;

  constructor(private http: HttpClient) {}

  loadConfig(): Observable<OidcPublicConfig> {
    return this.http.get<OidcPublicConfig>("/api/oidc/config").pipe(
      catchError((error) => {
        console.error("Failed to load OIDC configuration:", error);
        return throwError(
          () => new Error("OIDC configuration could not be loaded"),
        );
      }),
    );
  }

  setConfig(config: OidcPublicConfig): void {
    this.config = config;
  }

  getConfig(): OidcPublicConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return (
      this.config !== null &&
      this.config.issuer !== "" &&
      this.config.clientId !== ""
    );
  }
}
