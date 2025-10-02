import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  HostListener,
} from "@angular/core";
import { RouterLink, RouterLinkActive, Router } from "@angular/router";
import { NgOptimizedImage, CommonModule } from "@angular/common";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { AuthService } from "../../services/auth.service";
import { ThemeService } from "../../services/theme.service";

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
  private sanitizer = inject(DomSanitizer);

  isProfileDropdownOpen = signal(false);
  isMobileMenuOpen = signal(false);

  get isHomePage(): boolean {
    return this.router.url === "/home" || this.router.url === "/";
  }

  toggleProfileDropdown() {
    this.isProfileDropdownOpen.update((value) => !value);
  }

  closeProfileDropdown() {
    this.isProfileDropdownOpen.set(false);
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
