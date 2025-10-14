import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html'
})
export class RegisterComponent {
  submitting = false;
  serverError: string | null = null;
  serverSuccess: string | null = null;

  form!: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group({
      callsign: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(32)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(128)]],
      passwordGroup: this.fb.group({
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
        confirmPassword: ['', [Validators.required]]
      }, { validators: passwordMatchValidator })
    });
  }

  get callsign() { return this.form.get('callsign'); }
  get email() { return this.form.get('email'); }
  get passwordGroup() { return this.form.get('passwordGroup'); }
  get password() { return this.form.get('passwordGroup.password'); }
  get confirmPassword() { return this.form.get('passwordGroup.confirmPassword'); }

  submit(): void {
    this.serverError = null;
    this.serverSuccess = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const callsign = this.callsign?.value?.trim();
    const email = this.email?.value?.trim();
    const password = (this.password?.value ?? '').toString();
    if (!callsign || !email || !password) {
      return;
    }

    this.submitting = true;
    this.auth.register({ callsign, email, password }).subscribe({
      next: (res) => {
        const msg = res?.message || 'Registration successful. You can now log in.';
        this.serverSuccess = msg;
        this.submitting = false;
        this.form.reset();
      },
      error: (err) => {
        console.error('Registration failed', err);
        const msg = err?.error?.message || 'Registration failed. Please try again.';
        this.serverError = msg;
        this.submitting = false;
      }
    });
  }
}
