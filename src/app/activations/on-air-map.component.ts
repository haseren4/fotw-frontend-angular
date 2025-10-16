import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivationsService, Activation } from './activations.service';
import { Site, SiteService } from '../site-service/site-service';

interface OnAirMarker {
  activation: Activation;
  site: Site;
}

@Component({
  selector: 'app-on-air-map',
  standalone: true,
  imports: [CommonModule],
  template: `
  <section class="container py-3">
    <h1 class="h3 mb-3">On-Air Activations Map</h1>
    <div *ngIf="loading" class="alert alert-info">Loading map…</div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

    <div *ngIf="!loading && !error" class="map-container">
      <div class="world-map">
        <ng-container *ngFor="let m of markers">
          <div class="pin"
               [style.left]="toLeftPercent(m.site.longitude)"
               [style.top]="toTopPercent(m.site.latitude)"
               tabindex="0"
               (mouseenter)="onHover(m)"
               (mouseleave)="onHover(null)"
               (focusin)="onHover(m)"
               (focusout)="onHover(null)">
            <div class="dot active"></div>
          </div>
        </ng-container>

        <div class="map-tooltip-bottom" *ngIf="hovered as hm">
          <div class="title">{{ hm.site.location || hm.site.qth || ('Site #' + hm.site.id) }}</div>
          <div class="line" *ngIf="hm.activation?.callsign">By {{ hm.activation.callsign }}</div>
          <div class="line coords">{{ hm.site.latitude }}, {{ hm.site.longitude }}</div>
          <div class="line" *ngIf="hm.activation.startedAt || hm.activation['start_time'] || hm.activation['started_at']">
            Started: {{ (hm.activation.startedAt || hm.activation['start_time'] || hm.activation['started_at']) | date:'medium' }}
          </div>
        </div>
      </div>
    </div>
  </section>
  `,
  styles: [
    `
    .map-container { width: 100%; max-width: 1000px; margin: 0 auto; }
    .world-map {
      position: relative; width: 100%; aspect-ratio: 2 / 1;
      background-image: url('https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg');
      background-size: 100% 100%; background-position: left top; background-color: #dbe7f3;
      border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; overflow: hidden;
    }
    .pin { position: absolute; transform: translate(-50%, -50%); cursor: pointer; }
    .pin .dot { width: 10px; height: 10px; background: #dc3545; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgba(0,0,0,0.2); }
    .pin .dot.active { background: #28a745; }
    .map-tooltip-bottom {
      position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
      max-width: calc(100% - 16px); background: rgba(0,0,0,0.85); color: #fff; padding: 8px 12px; border-radius: 6px;
      font-size: 12px; line-height: 1.3; z-index: 3; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .map-tooltip-bottom .title { font-weight: 600; margin-bottom: 2px; }
    .map-tooltip-bottom .coords { opacity: 0.85; }
    `
  ]
})
export class OnAirMapComponent implements OnInit {
  private activationsSvc = inject(ActivationsService);
  private sitesSvc = inject(SiteService);

  loading = true;
  error: string | null = null;

  markers: OnAirMarker[] = [];
  hovered: OnAirMarker | null = null;

  async ngOnInit(): Promise<void> {
    try {
      this.error = null;
      this.markers = await this.fetchOnAirMarkers();
      this.loading = false;
    } catch (e) {
      console.error(e);
      this.error = 'Failed to load the On-Air map.';
      this.loading = false;
    }
  }

  // Normalize and filter to on-air activations; resolve site
  private async fetchOnAirMarkers(): Promise<OnAirMarker[]> {
    const activations = await this.activationsSvc.getActivations().toPromise().catch(() => [] as Activation[]);
    const now = new Date();

    const normalized = (activations ?? []).map(a => {
      const anyA: any = a as any;
      const startedAt = a?.startedAt ?? anyA['start_time'] ?? anyA['started_at'];
      const endedAt = a?.endedAt ?? anyA['end_time'] ?? anyA['ended_at'];
      const siteId = a?.siteId ?? anyA['site_id'] ?? anyA?.site?.id;
      const status = (a as any)?.status ?? anyA['status'];
      return { ...a, startedAt, endedAt, siteId, status } as Activation;
    });

    const onAir = normalized.filter(a => {
      const endStr = (a as any)?.endedAt as any;
      const ended = typeof endStr === 'string' ? endStr.trim().length > 0 : !!endStr;
      const status = ((a as any)?.status || '').toString();
      const startStr = (a as any)?.startedAt;
      const startOk = startStr ? Date.parse(startStr as any) <= now.getTime() : true;
      return (!ended && startOk) || status === 'on_air';
    });

    const markers: OnAirMarker[] = [];

    for (const a of onAir) {
      let site: Site | undefined = (a as any)?.site ?? undefined;
      const siteId = (a as any)?.site?.id ?? (a as any)?.siteId ?? (a as any)['site_id'];
      if (!site && siteId != null && String(siteId).trim() !== '') {
        try {
          site = await this.sitesSvc.getById(siteId).toPromise();
        } catch {
          site = undefined;
        }
      }
      if (site && site.latitude != null && site.longitude != null) {
        markers.push({ activation: a, site });
      }
    }
    return markers;
  }

  // Helpers copied from LocationMap for consistent positioning
  toLeftPercent(lon?: number): string {
    if (lon == null || Number.isNaN(lon as any)) return '0%';
    const normLon = ((Number(lon) + 540) % 360) - 180; // wrap to [-180, 180)
    const x = (normLon + 180) / 360; // 0..1
    return (x * 100).toFixed(3) + '%';
  }

  toTopPercent(lat?: number): string {
    if (lat == null || Number.isNaN(lat as any)) return '0%';
    const clampedLat = Math.min(90, Math.max(-90, Number(lat)));
    const y = (90 - clampedLat) / 180; // 0..1
    return (y * 100).toFixed(3) + '%';
  }

  onHover(m: OnAirMarker | null): void {
    this.hovered = m;
  }
}
