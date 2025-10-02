import { Injectable, signal } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, of, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { GravatarConfig, GravatarProfile } from "../models/gravatar.model";

@Injectable({
  providedIn: "root",
})
export class GravatarService {
  private config = signal<GravatarConfig | null>(null);
  private profileCache = new Map<string, GravatarProfile>();
  private hashCache = new Map<string, string>(); // Cache email->hash mappings

  constructor(private http: HttpClient) {}

  loadConfig(): Observable<GravatarConfig> {
    console.log("[GravatarService] Loading Gravatar API configuration...");
    return this.http.get<GravatarConfig>("/api/gravatar/config").pipe(
      tap((config) => {
        this.config.set(config);
        console.log("[GravatarService] Gravatar API key loaded successfully");
        console.log(
          "[GravatarService] API key preview:",
          config.apiKey ? `${config.apiKey.substring(0, 10)}...` : "empty",
        );
      }),
      catchError((error) => {
        console.warn(
          "[GravatarService] Gravatar API key not configured:",
          error.message,
        );
        console.log(
          "[GravatarService] Will use fallback avatar generation (identicons)",
        );
        return throwError(() => error);
      }),
    );
  }

  isConfigured(): boolean {
    const configured = this.config() !== null && !!this.config()?.apiKey;
    console.log("[GravatarService] Is configured:", configured);
    return configured;
  }

  /**
   * Get Gravatar profile by email hash
   * Implements the official Gravatar REST API
   * https://docs.gravatar.com/rest/getting-started/
   */
  getProfileByEmail(email: string): Observable<GravatarProfile | null> {
    console.log("[GravatarService] Getting profile for email:", email);

    if (!this.isConfigured()) {
      console.log(
        "[GravatarService] API not configured, skipping profile fetch",
      );
      return of(null);
    }

    // Use proper SHA-256 hash asynchronously
    return new Observable<GravatarProfile | null>((observer) => {
      this.hashEmailAsync(email).then((hash) => {
        console.log("[GravatarService] SHA-256 hash for profile:", hash);

        // Check cache first
        if (this.profileCache.has(hash)) {
          console.log("[GravatarService] Profile found in cache");
          observer.next(this.profileCache.get(hash)!);
          observer.complete();
          return;
        }

        console.log(
          "[GravatarService] Fetching profile from API:",
          `https://api.gravatar.com/v3/profiles/${hash}`,
        );

        const apiKey = this.config()!.apiKey;
        const headers = new HttpHeaders({
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        });

        this.http
          .get<GravatarProfile>(
            `https://api.gravatar.com/v3/profiles/${hash}`,
            { headers },
          )
          .pipe(
            tap((profile) => {
              console.log("[GravatarService] Profile fetched successfully:", {
                hash: profile.hash,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
              });
              // Cache the profile
              this.profileCache.set(hash, profile);
            }),
            catchError((error) => {
              console.warn(
                `[GravatarService] Gravatar profile not found for ${hash}:`,
                error,
              );
              console.log(
                "[GravatarService] Will use fallback avatar URL for this user",
              );
              return of(null);
            }),
          )
          .subscribe({
            next: (profile) => observer.next(profile),
            error: (error) => observer.error(error),
            complete: () => observer.complete(),
          });
      });
    });
  }

  /**
   * Get avatar URL for an email (async version for proper SHA-256 hashing)
   * This is the correct implementation per Gravatar specs
   */
  async getAvatarUrlAsync(email: string, size: number = 200): Promise<string> {
    console.log(
      `[GravatarService] Getting avatar URL for email: "${email}", size: ${size}`,
    );

    if (!email) {
      console.log("[GravatarService] Email is empty, returning default avatar");
      return this.getDefaultAvatarUrl(size);
    }

    // Use proper SHA-256 hash
    const hash = await this.hashEmailAsync(email);
    const avatarUrl = `https://gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=pg`;
    console.log("[GravatarService] Generated avatar URL:", avatarUrl);
    console.log("[GravatarService] SHA-256 hash:", hash);
    return avatarUrl;
  }

  /**
   * Get avatar URL synchronously using cached hash
   * Falls back to default avatar if hash not yet computed
   */
  getAvatarUrl(email: string, size: number = 200): string {
    console.log(
      `[GravatarService] Getting avatar URL (sync) for email: "${email}", size: ${size}`,
    );

    if (!email) {
      console.log("[GravatarService] Email is empty, returning default avatar");
      return this.getDefaultAvatarUrl(size);
    }

    // Check if we have a cached hash
    if (this.hashCache.has(email)) {
      const hash = this.hashCache.get(email)!;
      const avatarUrl = `https://gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=pg`;
      console.log("[GravatarService] Using cached SHA-256 hash:", hash);
      return avatarUrl;
    }

    // Compute hash asynchronously and cache it for next time
    this.hashEmailAsync(email).then((hash) => {
      this.hashCache.set(email, hash);
      console.log(
        `[GravatarService] SHA-256 hash computed and cached: ${hash}`,
      );
    });

    // Return default avatar as placeholder
    console.log(
      "[GravatarService] SHA-256 hash not yet computed, returning default",
    );
    return this.getDefaultAvatarUrl(size);
  }

  /**
   * Get default avatar URL
   */
  private getDefaultAvatarUrl(size: number = 200): string {
    return `https://gravatar.com/avatar/00000000000000000000000000000000?s=${size}&d=mp&r=pg`;
  }

  /**
   * Get email hash (public method for use in components)
   * Returns the SHA-256 hash of an email address
   */
  async getEmailHashAsync(email: string): Promise<string> {
    return this.hashEmailAsync(email);
  }

  /**
   * Hash email address using SHA-256 (as per Gravatar v3 API spec)
   * CRITICAL: This is the ONLY correct way to hash emails for Gravatar
   * https://docs.gravatar.com/api/avatars/
   */
  private async hashEmailAsync(email: string): Promise<string> {
    // BOTH steps are required: trim() then toLowerCase()
    const normalized = email.trim().toLowerCase();

    console.log(
      `[GravatarService] Hashing email with SHA-256: "${email}" -> normalized: "${normalized}"`,
    );

    // Create SHA256 hash using Web Crypto API
    const msgBuffer = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    console.log("[GravatarService] SHA-256 hash generated:", hash);
    return hash;
  }

  /**
   * Clear the profile cache
   */
  clearCache(): void {
    console.log(
      `[GravatarService] Clearing profile cache (${this.profileCache.size} entries)`,
    );
    this.profileCache.clear();
  }
}
