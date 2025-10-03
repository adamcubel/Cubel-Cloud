import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    // Redirect to the login page if not authenticated
    return router.parseUrl("/login");
  }

  const user = authService.currentUser();
  if (user && user.role === "admin") {
    return true;
  }

  // Redirect to home if not an admin
  return router.parseUrl("/home");
};
