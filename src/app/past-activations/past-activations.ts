import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivationsService, Activation } from '../activations/activations.service';
import { StatusIconPipe } from '../shared/status-icon.pipe';

interface Stats {
  totalCount: number;
  totalHours: number;
  avgMinutes: number;
  longestMinutes: number;
}

@Component({
  selector: 'app-past-activations',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusIconPipe],
  templateUrl: './past-activations.html'
})
export class PastActivationsComponent implements OnInit {
  private svc = inject(ActivationsService);

  loading = true;
  error: string | null = null;
  activations: Activation[] = [];
  callsign: string | null = null;
  stats: Stats | null = null;

  ngOnInit(): void {
    this.callsign = this.readCallsignFromCookies();
    this.fetch();
  }

  private fetch(): void {
    this.loading = true;
    this.error = null;

    const params: Record<string, string | number | boolean> = {
      status: 'completed'
    };
    if (this.callsign) {
      params['callsign'] = this.callsign;
      // Include common alternative param names the backend might support
      params['operator_callsign'] = this.callsign;
      params['author_callsign'] = this.callsign;
      params['user_callsign'] = this.callsign;
    }

    this.svc.getActivations(params).subscribe({
      next: (rows) => {
        const arr = Array.isArray(rows) ? rows : [];
        const normalized = arr.map(a => this.normalizeActivation(a));
        // Only those that truly look completed (have endedAt)
        const completed = normalized.filter(a => !!a.endedAt && !isNaN(Date.parse(a.endedAt as string)));
        // If callsign was not applied server-side, filter client-side too
        const filtered = this.callsign
          ? completed.filter(a => (a.callsign ?? (a as any)['operator_callsign'] ?? '').toString().toUpperCase() === this.callsign)
          : completed;
        // Sort by endedAt desc
        filtered.sort((a, b) => {
          const aTs = Date.parse((a.endedAt as string) ?? '') || 0;
          const bTs = Date.parse((b.endedAt as string) ?? '') || 0;
          return bTs - aTs;
        });
        this.activations = filtered;
        this.computeStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load past activations', err);
        this.error = 'Failed to load past activations.';
        this.loading = false;
      }
    });
  }

  trackById = (index: number, item: Activation) => item?.id ?? index;

  getDurationMinutes(a: Activation): number {
    const anyA: any = a as any;
    const startStr = (a.startedAt ?? anyA['start_time'] ?? anyA['started_at']) as string | undefined;
    const endStr = (a.endedAt ?? anyA['end_time'] ?? anyA['ended_at']) as string | undefined;
    const startTs = startStr ? Date.parse(startStr) : NaN;
    const endTs = endStr ? Date.parse(endStr) : NaN;
    if (isNaN(startTs) || isNaN(endTs)) return 0;
    const minutes = (endTs - startTs) / 60000;
    return Math.max(0, minutes);
  }

  private computeStats(): void {
    if (!this.activations || this.activations.length === 0) {
      this.stats = { totalCount: 0, totalHours: 0, avgMinutes: 0, longestMinutes: 0 };
      return;
    }
    const durations = this.activations.map(a => this.getDurationMinutes(a));
    const totalMinutes = durations.reduce((sum, m) => sum + (isNaN(m) ? 0 : m), 0);
    const longestMinutes = durations.reduce((max, m) => Math.max(max, (isNaN(m) ? 0 : m)), 0);
    const avgMinutes = totalMinutes / durations.length;
    const totalHours = totalMinutes / 60;
    this.stats = {
      totalCount: this.activations.length,
      totalHours,
      avgMinutes,
      longestMinutes
    };
  }

  private normalizeActivation(a: Activation): Activation {
    const anyA: any = a as any;
    const startedAt = a?.startedAt ?? anyA['start_time'] ?? anyA['started_at'];
    const endedAt = a?.endedAt ?? anyA['end_time'] ?? anyA['ended_at'];
    const siteId = a?.siteId ?? anyA['site_id'] ?? anyA?.site?.id;
    const callsign = a?.callsign ?? anyA?.user?.callsign ?? anyA?.['operator_callsign'];
    return { ...a, startedAt, endedAt, siteId, callsign } as Activation;
  }

  private readCallsignFromCookies(): string | null {
    try {
      const cookies = document.cookie?.split(';') ?? [];
      for (const pair of cookies) {
        const [k, ...rest] = pair.trim().split('=');
        if (!k) continue;
        if (k.trim().toLowerCase() === 'callsign') {
          const v = decodeURIComponent(rest.join('=') ?? '').trim();
          return v ? v.toUpperCase() : null;
        }
      }
    } catch {}
    return null;
  }
}
