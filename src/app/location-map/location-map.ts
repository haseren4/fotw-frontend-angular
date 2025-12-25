import {Component, OnInit, Input, Output, EventEmitter, input} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Site } from '../site-service/site-service';

@Component({
  selector: 'app-location-map',
  imports: [CommonModule],
  templateUrl: './location-map.html',
  styleUrl: './location-map.scss'
})
export class LocationMap implements OnInit {
  // Controlled inputs from parent
  @Input() sites: Site[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;

  // Optional flags (parent-controllable)
  @Input() showArmySites = true;
  @Input() showAFSites = false;
  @Input() showMarinesSites = false;
  @Input() showNavySites = false;
  @Input() showSpaceSites = false;
  @Input() showCoastguardSites = false;

  // Backwards-compat: allow passing a single site; if provided and sites is empty, we'll show just this
  @Input() singleSite?: Site | null;

  // Outputs to let parent react to interactions
  @Output() siteClick = new EventEmitter<Site>();
  @Output() hoverSiteChange = new EventEmitter<Site | null>();

  // Track currently hovered/focused site for bottom tooltip
  hoveredSite: Site | null = null;

  ngOnInit(): void {
    if ((this.sites == null || this.sites.length === 0) && this.singleSite && this.singleSite.latitude != null && this.singleSite.longitude != null) {
      this.sites = [this.singleSite];
      this.loading = false;
      this.error = null;
    }
  }

  // Derived list to ensure only plottable active sites are shown
  get displayedSites(): Site[] {
    return (this.sites ?? []).filter(s => (s.active === true) && s.latitude != null && s.longitude != null);
  }

  // Handlers to control bottom tooltip visibility/content
  onHover(site: Site | null): void {
    this.hoveredSite = site;
    this.hoverSiteChange.emit(site);
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
    if (s == null) return;
    this.siteClick.emit(s);
  }
}
