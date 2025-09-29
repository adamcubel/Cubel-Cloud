
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

  getGravatarUrl(email: string, size: number = 40): string {
    // Create MD5 hash of email for Gravatar
    const hash = this.md5(email.toLowerCase().trim());
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=pg`;
  }

  private md5(str: string): string {
    // Simple MD5 implementation for Gravatar
    const crypto = globalThis.crypto;
    if (crypto && crypto.subtle) {
      // For modern browsers with crypto.subtle (async), we'll use a simpler approach
      // Since this is for demo purposes, we'll use a simple hash
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    }

    // Fallback simple hash for demo
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
