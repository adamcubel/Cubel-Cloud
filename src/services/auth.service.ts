
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserRole } from '../models/user.model';

const MOCK_USERS: Record<UserRole, User> = {
  admin: { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
  user: { id: '2', name: 'Standard User', email: 'user@example.com', role: 'user' },
  guest: { id: '3', name: 'Guest User', email: 'guest@example.com', role: 'guest' },
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);
  
  currentUser = signal<User | null>(null);
  isLoggedIn = computed(() => !!this.currentUser());

  login(role: UserRole): void {
    const user = MOCK_USERS[role];
    if (user) {
      this.currentUser.set(user);
      this.router.navigate(['/applications']);
    }
  }

  logout(): void {
    this.currentUser.set(null);
    this.router.navigate(['/home']);
  }
}
