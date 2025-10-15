import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivationsService, Activation } from './activations.service';
import { Site, SiteService } from '../site-service/site-service';

// Minimal Leaflet type to keep TS quiet without adding deps
declare const L: any;

interface OnAirMarker {
  activation: Activation;
  site: Site;
}

@Component({
  selector: 'app-on-air-map',
  standalone: true,
  imports: [CommonModule],
  template: `
  <section class="container my-4">
    <h1 class="h3 mb-3">On-Air Activations Map</h1>
    <div *ngIf="loading" class="alert alert-info">Loading map…</div>
    <div *ngIf="error" class="alert alert-danger">{{ error }}</div>
    <div id="onAirMap" class="onair-map" *ngIf="!loading && !error"></div>
    <div class="text-muted small mt-2" *ngIf="!loading && !error">
      Data shows all activations currently on air (no end time). Markers are clustered to reduce clutter.
    </div>
  </section>
  `,
  styles: [
    `
    .onair-map {
      width: 100%;
      height: 480px;
      border-radius: 0.25rem;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.1);
    }
    `
  ]
})
export class OnAirMapComponent implements OnInit, OnDestroy {
  private activationsSvc = inject(ActivationsService);
  private sitesSvc = inject(SiteService);

  loading = true;
  error: string | null = null;
  private map: any;
  private leafletLoaded = false;

  async ngOnInit(): Promise<void> {
    try {
      // Load Leaflet JS and CSS lazily from CDN
      await this.ensureLeaflet();
      const markers = await this.fetchOnAirMarkers();
      this.initMap(markers);
      this.loading = false;
    } catch (e) {
      console.error(e);
      this.error = 'Failed to load the On-Air map.';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    // nothing special; leaflet cleans up with DOM removal
    try { if (this.map && this.map.remove) { this.map.remove(); } } catch {}
  }

  private ensureLeaflet(): Promise<void> {
    if (this.leafletLoaded) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      // CSS
      const existingCss = document.querySelector('link[data-leaflet]') as HTMLLinkElement | null;
      if (!existingCss) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        link.setAttribute('data-leaflet', 'true');
        document.head.appendChild(link);
      }

      // JS
      const existing = document.querySelector('script[data-leaflet]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => { this.leafletLoaded = true; resolve(); }, { once: true });
        if ((window as any).L) { this.leafletLoaded = true; resolve(); }
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.defer = true;
      script.setAttribute('data-leaflet', 'true');
      script.onload = () => { this.leafletLoaded = true; resolve(); };
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  }

  private async fetchOnAirMarkers(): Promise<OnAirMarker[]> {
    const activations = await this.activationsSvc.getActivations().toPromise().catch(() => [] as Activation[]);
    const now = new Date();

    // Normalize and filter to on-air (no end time OR explicit status on_air) and started in the past
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
      // Prefer embedded site
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

  private initMap(markers: OnAirMarker[]): void {
    const container = document.getElementById('onAirMap');
    if (!container) return;

    // Default view: center roughly at Europe
    this.map = L.map(container).setView([51.0, 10.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    if (!markers || markers.length === 0) return;

    const group = L.featureGroup();
    for (const m of markers) {
      const lat = m.site.latitude;
      const lon = m.site.longitude;
      const title = (m.site.location || m.site.qth || `Site #${m.site.id}`);
      const callsign = (m.activation as any)?.callsign || (m.activation as any)?.user?.callsign || '';
      const when = (m.activation as any)?.startedAt || (m.activation as any)?.start_time || (m.activation as any)?.started_at || '';
      const popupHtml = `
        <div style="min-width:180px">
          <div style="font-weight:600">${title}</div>
          <div style="font-size:12px;color:#666">${lat}, ${lon}</div>
          <div style="margin-top:4px">By ${callsign || 'unknown'}</div>
          <div style="font-size:12px;color:#666">Started: ${when ? new Date(when as any).toLocaleString() : 'n/a'}</div>
        </div>
      `;
      L.marker([lat, lon]).addTo(group).bindPopup(popupHtml);
    }
    group.addTo(this.map);

    try {
      const bounds = group.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        this.map.fitBounds(bounds.pad(0.2));
      }
    } catch {}
  }
}
