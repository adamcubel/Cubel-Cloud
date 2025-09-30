
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { OidcConfigService } from '../../services/oidc-config.service';
import { UserRole } from '../../models/user.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: []
})
export class LoginComponent {
  authService = inject(AuthService);
  oidcConfigService = inject(OidcConfigService);

  loginAs(role: UserRole) {
    this.authService.mockLogin(role);
  }

  loginWithOIDC() {
    this.authService.login();
  }

  get isOIDCConfigured() {
    return this.oidcConfigService.isConfigured();
  }
}
