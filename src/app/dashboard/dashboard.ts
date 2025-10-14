import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MotdService } from '../motd/motd.service';
import { Observable, of } from 'rxjs';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  callsign: string | null = null;
  greeting: string | null = null;
  motd$!: Observable<string>;

  constructor(private motd: MotdService, private dashboardSvc: DashboardService) {}

  ngOnInit(): void {
    const cookieCallsign = this.readCallsignFromCookies();
    this.callsign = cookieCallsign;

    if (cookieCallsign) {
      this.dashboardSvc.getDashboardGreeting(cookieCallsign).subscribe({
        next: (dto) => {
          try {
            const cs = (dto?.callsign ?? cookieCallsign ?? '').toString();
            this.callsign = cs ? cs.toUpperCase() : this.callsign;
            this.greeting = (dto as any)?.greeting ?? null;
            const motd = (dto as any)?.motd;
            if (typeof motd === 'string' && motd.trim().length > 0) {
              this.motd$ = of(motd);
            } else {
              this.motd$ = this.motd.getMotd();
            }
          } catch {
            this.motd$ = this.motd.getMotd();
          }
        },
        error: () => {
          this.motd$ = this.motd.getMotd();
        }
      });
    } else {
      this.motd$ = this.motd.getMotd();
    }
  }

  private readCallsignFromCookies(): string | null {
    try {
      const cookie = document.cookie ?? '';
      if (!cookie) return null;
      const map = new Map<string, string>();
      cookie.split(';').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k) map.set(k.trim().toLowerCase(), decodeURIComponent((v ?? '').trim()));
      });
      // Prefer explicit 'callsign' cookie, otherwise fall back to any known name
      const preferred = map.get('callsign');
      if (preferred) return preferred.toUpperCase();
      const fallbacks = ['auth', 'token', 'session', 'jid', 'jsessionid'];
      for (const name of fallbacks) {
        const val = map.get(name);
        if (val) return val;
      }
      return null;
    } catch {
      return null;
    }
  }
}
