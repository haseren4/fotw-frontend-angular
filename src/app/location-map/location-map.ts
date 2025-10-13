import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SiteService, Site } from '../site-service/site-service';

@Component({
  selector: 'app-location-map',
  imports: [CommonModule],
  templateUrl: './location-map.html',
  styleUrl: './location-map.scss'
})
export class LocationMap implements OnInit {
  sites: Site[] = [];
  loading = false;
  error: string | null = null;

  // Track currently hovered/focused site for bottom tooltip
  hoveredSite: Site | null = null;

  constructor(private siteService: SiteService) {}

  ngOnInit(): void {
    this.fetchSites();
  }

  private fetchSites(): void {
    this.loading = true;
    this.error = null;
    this.siteService.getAllSites().subscribe({
      next: (sites) => {
        this.sites = (sites ?? []).filter(s => s.latitude != null && s.longitude != null);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load sites for map', err);
        this.error = 'Failed to load sites.';
        this.loading = false;
      }
    });
  }

  // Handlers to control bottom tooltip visibility/content
  onHover(site: Site | null): void {
    this.hoveredSite = site;
  }

  // Equirectangular projection: convert lat/lon to percentage positions
  // Normalize longitude to [-180, 180) and clamp latitude to [-90, 90]
  toLeftPercent(lon?: number): string {
    if (lon == null || Number.isNaN(lon)) return '0%';
    const normLon = ((lon + 540) % 360) - 180; // wrap to [-180, 180)
    const x = (normLon + 180) / 360; // 0..1
    return (x * 100).toFixed(3) + '%';
  }

  toTopPercent(lat?: number): string {
    if (lat == null || Number.isNaN(lat)) return '0%';
    const clampedLat = Math.min(90, Math.max(-90, lat));
    const y = (90 - clampedLat) / 180; // 0..1
    return (y * 100).toFixed(3) + '%';
  }

  onClick(s: Site) {
    if(s == null) return;
    console.log('Site clicked:', s);

  }
}
