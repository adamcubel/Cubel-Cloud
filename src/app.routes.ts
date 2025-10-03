import { Routes } from "@angular/router";
import { authGuard } from "./guards/auth.guard";
import { adminGuard } from "./guards/admin.guard";

export const APP_ROUTES: Routes = [
  {
    path: "",
    pathMatch: "full",
    redirectTo: "home",
  },
  {
    path: "home",
    loadComponent: () =>
      import("./components/home/home.component").then((c) => c.HomeComponent),
  },
  {
    path: "login",
    loadComponent: () =>
      import("./components/login/login.component").then(
        (c) => c.LoginComponent,
      ),
  },
  {
    path: "about",
    loadComponent: () =>
      import("./components/about/about.component").then(
        (c) => c.AboutComponent,
      ),
  },
  {
    path: "auth/callback",
    loadComponent: () =>
      import("./components/auth-callback/auth-callback.component").then(
        (c) => c.AuthCallbackComponent,
      ),
  },
  {
    path: "applications",
    loadComponent: () =>
      import("./components/applications/applications.component").then(
        (c) => c.ApplicationsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: "user-management",
    loadComponent: () =>
      import("./components/user-management/user-management.component").then(
        (c) => c.UserManagementComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: "**",
    redirectTo: "home",
  },
];
