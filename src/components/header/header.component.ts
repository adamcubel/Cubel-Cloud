import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  HostListener,
} from "@angular/core";
import { RouterLink, RouterLinkActive, Router } from "@angular/router";
import { NgOptimizedImage, CommonModule } from "@angular/common";
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

  isProfileDropdownOpen = signal(false);

  get isHomePage(): boolean {
    return this.router.url === "/home" || this.router.url === "/";
  }

  toggleProfileDropdown() {
    this.isProfileDropdownOpen.update((value) => !value);
  }

  closeProfileDropdown() {
    this.isProfileDropdownOpen.set(false);
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
