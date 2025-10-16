import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-header-navbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './header-navbar.html',
  styleUrl: './header-navbar.css'
})
export class HeaderNavbar {
  constructor(private router: Router) {}

  // Read a cookie by name (defensive against parsing issues)
  private readCookie(name: string): string | null {
    try {
      const cookies = document.cookie?.split(';') ?? [];
      for (const raw of cookies) {
        const [k, v] = raw.split('=');
        if (k && k.trim() === name) {
          return decodeURIComponent(v || '').trim() || null;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  // Consider multiple possible auth cookies, since some environments use HttpOnly tokens instead of a readable callsign cookie
  private hasAnyAuthCookie(): boolean {
    const keys = ['callsign', 'auth', 'auth_token', 'token', 'session', 'sessionid', 'session_id'];
    return keys.some(k => !!this.readCookie(k));
  }

  get isLoggedIn(): boolean {
    return this.hasAnyAuthCookie();
  }

  get homeLink(): string {
    return this.isLoggedIn ? '/dashboard' : '/home';
  }

  private clearCookie(name: string): void {
    try {
      const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
      // Try common path variants
      document.cookie = `${name}=; expires=${past}; path=/;`;
      document.cookie = `${name}=; expires=${past}; path=/; SameSite=Lax;`;
      document.cookie = `${name}=; expires=${past}; path=/; domain=${location.hostname};`;
    } catch {
      // ignore
    }
  }

  logout(): void {
    // Remove likely auth cookies
    ['callsign', 'auth', 'auth_token', 'token', 'session', 'sessionid', 'session_id'].forEach(n => this.clearCookie(n));
    // Navigate to home and force a refresh of navbar state
    this.router.navigateByUrl('/home').then(() => {
      // In case some state is cached, trigger a minimal reload of the app shell
      // without a full hard refresh.
    });
  }
}
