import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  HostListener,
  computed,
  effect,
} from "@angular/core";
import { RouterLink, RouterLinkActive, Router } from "@angular/router";
import { NgOptimizedImage, CommonModule } from "@angular/common";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { AuthService } from "../../services/auth.service";
import { ThemeService } from "../../services/theme.service";
import { GravatarService } from "../../services/gravatar.service";

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage, CommonModule],
})
export class HeaderComponent {
  authService = inject(AuthService);
  router = inject(Router);
  themeService = inject(ThemeService);
  gravatarService = inject(GravatarService);
  private sanitizer = inject(DomSanitizer);

  isProfileDropdownOpen = signal(false);
  isMobileMenuOpen = signal(false);
  gravatarProfileExists = signal<boolean | null>(null);
  gravatarLoadTimeout = signal<number | null>(null);

  get isHomePage(): boolean {
    return this.router.url === "/home" || this.router.url === "/";
  }

  toggleProfileDropdown() {
    this.isProfileDropdownOpen.update((value) => !value);

    // Only check profile when opening
    if (!this.isProfileDropdownOpen()) {
      return;
    }

    // Clear any existing timeout
    if (this.gravatarLoadTimeout()) {
      window.clearTimeout(this.gravatarLoadTimeout()!);
    }

    // Check if Gravatar profile exists (only if we haven't checked yet)
    const userEmail = this.authService.currentUser()?.email;
    if (
      userEmail &&
      this.gravatarProfileExists() === null &&
      this.gravatarService.isConfigured()
    ) {
      console.log(
        "[HeaderComponent] Checking if Gravatar profile exists for:",
        userEmail,
      );

      this.gravatarService.getProfileByEmail(userEmail).subscribe({
        next: (profile) => {
          const exists = profile !== null;
          console.log("[HeaderComponent] Gravatar profile exists:", exists);
          this.gravatarProfileExists.set(exists);
        },
        error: (error) => {
          console.warn(
            "[HeaderComponent] Error checking Gravatar profile:",
            error,
          );
          this.gravatarProfileExists.set(false);
        },
      });

      // Set a timeout to show fallback if check takes too long
      const timeout = window.setTimeout(() => {
        if (this.gravatarProfileExists() === null) {
          console.log(
            "[HeaderComponent] Gravatar profile check timed out, using fallback",
          );
          this.gravatarProfileExists.set(false);
        }
      }, 2000);
      this.gravatarLoadTimeout.set(timeout);
    } else if (!this.gravatarService.isConfigured()) {
      // No Gravatar API configured, use fallback
      this.gravatarProfileExists.set(false);
    }
  }

  closeProfileDropdown() {
    this.isProfileDropdownOpen.set(false);

    // Clear timeout when closing
    if (this.gravatarLoadTimeout()) {
      window.clearTimeout(this.gravatarLoadTimeout()!);
      this.gravatarLoadTimeout.set(null);
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((value) => !value);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  /**
   * Get the Gravatar profile card URL
   * Uses the .card format for direct iframe embedding
   * https://docs.gravatar.com/sdk/profiles/
   */
  getGravatarProfileUrl(): SafeResourceUrl {
    const hash = this.authService.userGravatarHash();
    if (!hash) {
      return this.sanitizer.bypassSecurityTrustResourceUrl("about:blank");
    }

    // Using the Gravatar profile card URL (hash.card)
    const url = `https://gravatar.com/${hash}.card`;
    console.log("[HeaderComponent] Gravatar profile card URL:", url);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Close dropdown if clicking outside of it
    if (
      this.isProfileDropdownOpen() &&
      !target.closest(".profile-dropdown-container")
    ) {
      this.closeProfileDropdown();
    }
  }
}
