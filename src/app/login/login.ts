import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html'
})
export class LoginComponent {
  form!: FormGroup;
  submitting = false;
  serverError: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      callsign: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(32)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]]
    });
  }

  get callsign() { return this.form.get('callsign'); }
  get password() { return this.form.get('password'); }

  submit(): void {
    this.serverError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const callsign = (this.callsign?.value ?? '').toString().trim();
    const password = (this.password?.value ?? '').toString();
    if (!callsign || !password) return;

    this.submitting = true;
    this.auth.login({ callsign, password }).subscribe({
      next: (res) => {
        if (res.success) {
          // Persist a readable display cookie with the user's callsign (in case the server cookie is HttpOnly)
          // 7 days expiry, SameSite=Lax to send on same-site navigations, Path=/ for the whole app.
          try {
            const val = encodeURIComponent(callsign.toUpperCase());
            document.cookie = `callsign=${val}; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
          } catch {}
          // Navigate to user dashboard on success
          this.router.navigateByUrl('/dashboard');
        } else {
          this.serverError = res.message || 'Login failed.';
        }
        this.submitting = false;
      },
      error: (err) => {
        console.error('Login failed', err);
        const msg = err?.error?.message || 'Login failed. Please check your callsign and password.';
        this.serverError = msg;
        this.submitting = false;
      }
    });
  }
}
