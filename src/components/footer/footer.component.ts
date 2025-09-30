import { Component, ChangeDetectionStrategy } from "@angular/core";

@Component({
  selector: "app-footer",
  templateUrl: "./footer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
