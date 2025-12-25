import { Component, OnInit } from '@angular/core';
import { LocationMap } from '../location-map/location-map';
import { Site, SiteService } from '../site-service/site-service';

@Component({
  selector: 'app-home-summary',
  imports: [
    LocationMap
  ],
  templateUrl: './home-summary.html',
  styleUrl: './home-summary.css'
})
export class HomeSummary implements OnInit {
  // State for the location map
  sites: Site[] = [];
  loading = true;
  error: string | null = null;

  constructor(private siteService: SiteService) {}

  ngOnInit(): void {
    this.loading = true;
    this.error = null;
    this.siteService.getAllSites().subscribe({
      next: (sites) => {
        this.sites = sites ?? [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load sites', err);
        this.error = 'Failed to load sites.';
        this.loading = false;
      }
    });
  }
}
