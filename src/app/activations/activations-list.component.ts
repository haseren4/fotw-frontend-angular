import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivationsService, Activation, ActivationPost } from './activations.service';
import { Site, SiteService } from '../site-service/site-service';
import { UnderscoreToSpacePipe } from '../shared/underscore-to-space.pipe';
import { StatusIconPipe } from '../shared/status-icon.pipe';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OnAirMapComponent } from './on-air-map.component';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface ActivationWithLatest {
  activation: Activation;
  latestPost?: ActivationPost;
  latestPostAuthor?: string;
  location?: Site;
}

@Component({
  selector: 'app-activations-list',
  standalone: true,
  imports: [CommonModule, UnderscoreToSpacePipe, StatusIconPipe, OnAirMapComponent],
  templateUrl: './activations-list.component.html',
  styleUrls: ['./activations-list.component.scss']
})
export class ActivationsListComponent implements OnInit {
  private svc = inject(ActivationsService);
  private siteSvc = inject(SiteService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  loading = true;
  error: string | null = null;
  items: ActivationWithLatest[] = [];

  // Modal state for ending an activation with optional ADIF upload
  showEndModal = false;
  selectedActivation: Activation | null = null;
  selectedAdifFile: File | null = null;
  submitting = false;
  submitError: string | null = null;

  // Build an OSM embed URL for iframes with a marker at the site and sanitize for resource URL context
  buildOsmEmbedUrlSafe(lat?: number, lon?: number, zoom = 13): SafeResourceUrl | null {
    if (lat === undefined || lat === null || lon === undefined || lon === null) return null;
    const delta = 0.03;
    const left = lon - delta;
    const bottom = lat - delta;
    const right = lon + delta;
    const top = lat + delta;
    const base = 'https://www.openstreetmap.org/export/embed.html';
    const params = new URLSearchParams({
      bbox: `${left},${bottom},${right},${top}`,
      layer: 'mapnik',
      marker: `${lat},${lon}`
    });
    const url = `${base}?${params.toString()}#map=${zoom}/${lat}/${lon}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit(): void {
    this.loading = true;
    this.error = null;
    this.svc.getActivations()
      .subscribe({
        next: (activations) => {
          if (!Array.isArray(activations)) activations = [] as any;

          // Normalize common backend snake_case fields into camelCase expected by the UI
          const normalized = activations.map(a => {
            const anyA: any = a as any;
            const startedAt = a?.startedAt ?? anyA['start_time'] ?? anyA['started_at'];
            const endedAt = a?.endedAt ?? anyA['end_time'] ?? anyA['ended_at'];
            const siteId = a?.siteId ?? anyA['site_id'] ?? anyA?.site?.id;
            const callsign = a?.callsign ?? anyA?.user?.callsign ?? anyA?.['operator_callsign'];
            return { ...a, startedAt, endedAt, siteId, callsign } as Activation;
          });

          // Filter to only show:
          // - On-air activations: no endedAt
          // - Future activations: startedAt is in the future
          const now = new Date();
          const filtered = normalized.filter(a => {
            const anyA: any = a as any;
            const endedRaw = a?.endedAt ?? anyA['end_time'] ?? anyA['ended_at'];
            const ended = endedRaw?.toString().trim();
            // We want on-air => not ended
            const onAir = !ended;

            const startRaw = a?.startedAt ?? anyA['start_time'] ?? anyA['started_at'];
            const startStr = startRaw?.toString().trim();
            const startDateValid = !!startStr && !isNaN(Date.parse(startStr));
            const future = startDateValid ? new Date(startStr as string) > now : false;

            return onAir || future;
          });

          // Initialize cards with activation data; if backend provided a full site object, use it
          this.items = filtered.map(a => {
            const loc = (a as any)?.site as Site | undefined;
            return { activation: a, location: loc };
          });

          // For each activation, fetch the latest post (best-effort) and, if needed, the Site details
          for (const item of this.items) {
            const id = item.activation?.id;
            if (id === undefined || id === null) continue;
            this.svc.getLatestPostForActivation(id).subscribe({
              next: (posts) => {
                let latest: any | undefined;
                if (Array.isArray(posts) && posts.length > 0) {
                  const sorted = posts.slice().sort((a: any, b: any) => {
                    const aDateStr = (a as any)['createdAt'] ?? (a as any)['created_at'] ?? '';
                    const bDateStr = (b as any)['createdAt'] ?? (b as any)['created_at'] ?? '';
                    const aTs = Date.parse(aDateStr) || 0;
                    const bTs = Date.parse(bDateStr) || 0;
                    return bTs - aTs; // newest first
                  });
                  latest = sorted[0];
                } else {
                  latest = undefined;
                }
                item.latestPost = latest ? { ...latest, createdAt: (latest as any)['createdAt'] ?? (latest as any)['created_at'] } : undefined;

                // Derive author's callsign for the latest post (robust to various API shapes)
                const rawAuthor = (latest as any)?.['author'];
                let authorCs: string | undefined;
                if (typeof rawAuthor === 'string') {
                  authorCs = rawAuthor;
                } else if (rawAuthor && typeof rawAuthor === 'object') {
                  authorCs = (rawAuthor as any)?.['callsign'] ?? (rawAuthor as any)?.['name'];
                }
                authorCs = authorCs
                  ?? (latest as any)?.['user']?.['callsign']
                  ?? (latest as any)?.['callsign']
                  ?? (latest as any)?.['operator_callsign']
                  ?? (latest as any)?.['author_callsign']
                  ?? (latest as any)?.['posted_by']
                  ?? (latest as any)?.['posted_by_callsign'];
                item.latestPostAuthor = (typeof authorCs === 'string' && authorCs.trim().length > 0)
                  ? authorCs.trim().toUpperCase()
                  : undefined;

                // Determine site id from latest post or activation
                const siteId = (latest?.['siteId'] ?? latest?.['site_id'] ?? item.activation?.siteId ?? (item.activation as any)?.['site_id'] ?? (item.activation as any)?.site?.id);
                if (!item.location && siteId !== undefined && siteId !== null && String(siteId).trim() !== '') {
                  this.siteSvc.getById(siteId).subscribe({
                    next: (site) => { item.location = site; },
                    error: () => { /* ignore */ }
                  });
                }
              },
              error: () => {
                // Non-fatal; keep the activation visible
              }
            });
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load activations', err);
          this.error = 'Failed to load activations.';
          this.loading = false;
        }
      });
  }

  trackById(index: number, item: ActivationWithLatest) {
    return item.activation?.id ?? index;
  }

  // Derived status helpers used for icon display
  isOnAir(a?: Activation | null): boolean {
    const anyA: any = a as any;
    const endedRaw = a?.endedAt ?? anyA?.['end_time'] ?? anyA?.['ended_at'];
    const ended = endedRaw?.toString().trim();
    // Consider on-air when there is no endedAt value (empty or undefined)
    return !ended;
  }

  isFuture(a?: Activation | null): boolean {
    const anyA: any = a as any;
    const startRaw = a?.startedAt ?? anyA?.['start_time'] ?? anyA?.['started_at'];
    const startStr = startRaw?.toString().trim();
    if (!startStr || isNaN(Date.parse(startStr))) return false;
    return new Date(startStr) > new Date();
  }

  getDisplayStatus(a?: Activation | null): 'on_air' | 'scheduled' {
    // On /activations we only display on-air or scheduled (future)
    return this.isOnAir(a) ? 'on_air' : 'scheduled';
  }

  // Human-friendly uptime string (for on-air activations)
  getUptime(a?: Activation | null): string | null {
    if (!a) return null;
    if (!this.isOnAir(a)) return null;
    const anyA: any = a as any;
    const startRaw = a?.startedAt ?? anyA?.['start_time'] ?? anyA?.['started_at'];
    const startStr = startRaw?.toString().trim();
    const startMs = startStr && !isNaN(Date.parse(startStr)) ? Date.parse(startStr) : NaN;
    if (isNaN(startMs)) return null;
    const nowMs = Date.now();
    let delta = Math.max(0, nowMs - startMs);

    const sec = Math.floor(delta / 1000);
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  }

  // UI Actions for ending activation
  openEndModal(a: Activation) {
    this.selectedActivation = a;
    this.selectedAdifFile = null;
    this.submitError = null;
    this.showEndModal = true;
  }

  closeEndModal() {
    if (this.submitting) return;
    this.showEndModal = false;
    this.selectedActivation = null;
    this.selectedAdifFile = null;
    this.submitError = null;
  }

  onAdifFileChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input?.files && input.files.length > 0 ? input.files[0] : null;
    this.selectedAdifFile = file;
  }

  async submitEndActivation() {
    if (!this.selectedActivation || this.submitting) return;
    this.submitting = true;
    this.submitError = null;
    const id = this.selectedActivation.id;
    try {
      if (this.selectedAdifFile) {
        await this.svc.uploadAdif(id, this.selectedAdifFile).toPromise();
      }
      await this.svc.endActivation(id).toPromise();
      // Navigate to dashboard and force reload to refresh state
      await this.router.navigate(['/dashboard']);
      // Force a reload to ensure dashboard data refreshes regardless of caching
      window.location.reload();
    } catch (e: any) {
      console.error('Failed to end activation', e);
      this.submitError = 'Failed to end activation. Please try again.';
    } finally {
      this.submitting = false;
      this.showEndModal = false;
    }
  }
}
