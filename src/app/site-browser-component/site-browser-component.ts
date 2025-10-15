import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SiteService, Site } from '../site-service/site-service';

@Component({
  selector: 'app-site-browser-component',
  imports: [CommonModule],
  templateUrl: './site-browser-component.html',
  styleUrl: './site-browser-component.scss'
})
export class SiteBrowserComponent implements OnInit {
  sites: Site[] = [];
  loading = false;
  error: string | null = null;

  constructor(private siteService: SiteService) {}

  ngOnInit(): void {
    this.loadSites();
  }

  private loadSites(): void {
    this.loading = true;
    this.error = null;
    this.siteService.getAllSites().subscribe({
      next: (sites) => {
        this.sites = (sites ?? []).filter(s => s.active === true);
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
