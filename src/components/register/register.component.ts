import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: "app-register",
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./register.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);

  registrationForm: FormGroup;
  submitted = false;
  submitting = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  constructor() {
    this.registrationForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      firstName: ["", [Validators.required, Validators.minLength(2)]],
      lastName: ["", [Validators.required, Validators.minLength(2)]],
      reason: ["", [Validators.required, Validators.minLength(10)]],
    });
  }

  get f() {
    return this.registrationForm.controls;
  }

  onSubmit() {
    this.submitted = true;
    this.error.set(null);

    if (this.registrationForm.invalid) {
      return;
    }

    this.submitting.set(true);

    const formData = {
      email: this.registrationForm.value.email,
      firstName: this.registrationForm.value.firstName,
      lastName: this.registrationForm.value.lastName,
      reason: this.registrationForm.value.reason,
    };

    this.http.post("/api/registration-requests", formData).subscribe({
      next: () => {
        this.success.set(true);
        this.submitting.set(false);
        setTimeout(() => {
          this.router.navigate(["/"]);
        }, 2000);
      },
      error: (err) => {
        console.error("Registration submission failed:", err);
        this.submitting.set(false);
        if (err.status === 409) {
          this.error.set(
            "A registration request for this email is already pending.",
          );
        } else {
          this.error.set(
            "Failed to submit registration request. Please try again.",
          );
        }
      },
    });
  }
}
