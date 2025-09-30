
import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent]
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    // Check if we're on the callback route - if so, don't initialize OAuth yet
    // The callback component will handle it
    const currentUrl = window.location.href;
    const isCallback = currentUrl.includes('/auth/callback') || currentUrl.includes('#/auth/callback');

    if (!isCallback) {
      this.authService.initializeOAuth();
    } else {
      console.log('[AppComponent] On callback route, delaying OAuth initialization');
    }

    // Listen for navigation events to initialize OAuth after callback is complete
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const isStillCallback = event.url.includes('/auth/callback');
        if (!isStillCallback && !this.authService.isInitialized()) {
          console.log('[AppComponent] Navigated away from callback, initializing OAuth');
          this.authService.initializeOAuth();
        }
      });
  }
}
