import { Routes } from "@angular/router";
import { authGuard } from "./guards/auth.guard";
import { adminGuard } from "./guards/admin.guard";
import { guestGuard } from "./guards/guest.guard";

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
    canActivate: [guestGuard],
  },
  {
    path: "login",
    loadComponent: () =>
      import("./components/login/login.component").then(
        (c) => c.LoginComponent,
      ),
    canActivate: [guestGuard],
  },
  {
    path: "register",
    loadComponent: () =>
      import("./components/register/register.component").then(
        (c) => c.RegisterComponent,
      ),
    canActivate: [guestGuard],
  },
  {
    path: "about",
    loadComponent: () =>
      import("./components/about/about.component").then(
        (c) => c.AboutComponent,
      ),
    canActivate: [guestGuard],
  },
  {
    path: "contact",
    loadComponent: () =>
      import("../app/components/contact/contact").then(
        (c) => c.ContactComponent,
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
