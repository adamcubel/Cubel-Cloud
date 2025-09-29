import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'cubel-cloud-theme';

  isDarkMode = signal<boolean>(false);

  constructor() {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.isDarkMode.set(savedTheme === 'dark' || (!savedTheme && prefersDark));

    // Apply theme changes to document
    effect(() => {
      this.applyTheme(this.isDarkMode());
    });
  }

  toggleTheme(): void {
    this.isDarkMode.update(current => !current);
  }

  private applyTheme(isDark: boolean): void {
    const theme = isDark ? 'dark' : 'light';

    // Update document class
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem(this.THEME_KEY, theme);
  }
}