import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage]
})
export class HeaderComponent {
  authService = inject(AuthService);
  router = inject(Router);
  themeService = inject(ThemeService);

  get isHomePage(): boolean {
    return this.router.url === '/home' || this.router.url === '/';
  }
}