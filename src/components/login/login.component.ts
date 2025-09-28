
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: []
})
export class LoginComponent {
  authService = inject(AuthService);

  loginAs(role: UserRole) {
    this.authService.login(role);
  }
}
