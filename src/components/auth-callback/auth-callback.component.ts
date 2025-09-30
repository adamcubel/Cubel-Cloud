import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OidcConfigService } from '../../services/oidc-config.service';
import { OAuthService } from 'angular-oauth2-oidc';

@Component({
  selector: 'app-auth-callback',
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 class="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">Completing authentication...</h2>
        <p class="text-slate-600 dark:text-slate-400">Please wait while we process your login.</p>
      </div>
    </div>
  `,
  standalone: true
})
export class AuthCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private oidcConfigService = inject(OidcConfigService);
  private oauthService = inject(OAuthService);

  async ngOnInit(): Promise<void> {
    console.log('[AuthCallback] Component initialized');
    console.log('[AuthCallback] Current URL:', window.location.href);
    console.log('[AuthCallback] URL Hash:', window.location.hash);
    console.log('[AuthCallback] URL Search:', window.location.search);

    try {
      // First, ensure OAuth is initialized (loads config and discovery document)
      if (!this.authService.isInitialized()) {
        console.log('[AuthCallback] Initializing OAuth first...');
        await this.authService.initializeOAuth();
      }

      const config = this.oidcConfigService.getConfig();

      if (config?.showDebugInformation) {
        console.log('[AuthCallback] PAUSED - Auto-redirect disabled for debugging');
        console.log('[AuthCallback] Set showDebugInformation to false in config to enable auto-redirect');
      }

      // Process the callback - this will handle the tokens in the URL
      console.log('[AuthCallback] Processing OIDC callback...');
      await this.authService.handleAuthCallback();

      // Wait a moment for the auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      const isLoggedIn = this.authService.isLoggedIn();
      const currentUser = this.authService.currentUser();

      console.log('[AuthCallback] Checking authentication status');
      console.log('[AuthCallback] Is logged in:', isLoggedIn);
      console.log('[AuthCallback] Current user:', currentUser);
      console.log('[AuthCallback] Has valid access token:', this.oauthService.hasValidAccessToken());
      console.log('[AuthCallback] Has valid ID token:', this.oauthService.hasValidIdToken());

      if (isLoggedIn) {
        console.log('[AuthCallback] User is logged in, navigating to /applications');
        this.router.navigate(['/applications']);
      } else {
        console.warn('[AuthCallback] User is NOT logged in, navigating to /home');
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('[AuthCallback] Error processing callback:', error);
      console.log('[AuthCallback] Redirecting to home page after error');
      this.router.navigate(['/home']);
    }
  }
}