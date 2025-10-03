import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class HomeComponent {
  authService = inject(AuthService);
}
