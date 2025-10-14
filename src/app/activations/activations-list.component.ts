import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivationsService, Activation, ActivationPost } from './activations.service';
import { Site, SiteService } from '../site-service/site-service';
import { UnderscoreToSpacePipe } from '../shared/underscore-to-space.pipe';
import { StatusIconPipe } from '../shared/status-icon.pipe';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface ActivationWithLatest {
  activation: Activation;
  latestPost?: ActivationPost;
  location?: Site;
}

@Component({
  selector: 'app-activations-list',
  standalone: true,
  imports: [CommonModule, UnderscoreToSpacePipe, StatusIconPipe],
  templateUrl: './activations-list.component.html',
  styleUrls: ['./activations-list.component.scss']
})
export class ActivationsListComponent implements OnInit {
  private svc = inject(ActivationsService);
  private siteSvc = inject(SiteService);
  private sanitizer = inject(DomSanitizer);
  loading = true;
  error: string | null = null;
  items: ActivationWithLatest[] = [];

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
          // Initialize cards with activation data
          this.items = activations.map(a => ({ activation: a }));
          // For each activation, fetch the latest post (best-effort)
          for (const item of this.items) {
            const id = item.activation?.id;
            if (id === undefined || id === null) continue;
            this.svc.getLatestPostForActivation(id).subscribe({
              next: (posts) => {
                const latest = Array.isArray(posts) && posts.length > 0 ? posts[0] : undefined;
                item.latestPost = latest;
                // Determine site id from latest post or activation
                const siteId = (latest?.['siteId'] ?? latest?.['site_id'] ?? item.activation?.siteId ?? item.activation?.['site_id']);
                if (siteId !== undefined && siteId !== null && String(siteId).trim() !== '') {
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
}
