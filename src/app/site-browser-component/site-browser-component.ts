import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SiteService, Site } from '../site-service/site-service';
import { UnderscoreToSpacePipe } from '../shared/underscore-to-space.pipe';
import { LocationMap } from '../location-map/location-map';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-site-browser-component',
  imports: [CommonModule, UnderscoreToSpacePipe, LocationMap, FormsModule],
  templateUrl: './site-browser-component.html',
  styleUrl: './site-browser-component.scss'
})
export class SiteBrowserComponent implements OnInit {
  dispArmySites = true;
  dispNavySites = false;
  dispAirforceSites = false;
  dispMarineSites = false;
  dispCoastguardSites = false;
  dispSpaceSites = false;
  finishedSiteList: Site[] = [];
  sites: Site[] = [];
  loading = false;
  error: string | null = null;
  protected selectedCategory: string = '';
  protected searchTerm: string = '';
  // QTH-specific filters (separate from general search)
  protected selectedQth: string = '';
  protected availableQths: string[] = [];
  private filteredSites: Site[] = [];

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
        // Build QTH dropdown options from loaded active sites
        const set = new Set<string>();
        for (const s of this.sites) {
          const q = (s.qth ?? '').toString().trim();
          if (q) set.add(q);
        }
        this.availableQths = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        // Apply initial filters once data arrives
        this.search();
      },
      error: (err) => {
        console.error('Failed to load sites', err);
        this.error = 'Failed to load sites.';
        this.loading = false;
      }
    });

  }

  onSiteClick(site: Site): void {
    if (!site) return;
    console.log('Site clicked from parent:', site);
  }

  protected search(): void {
    // Start from full site list
    let working: Site[] = [...(this.sites ?? [])];

    // Category filter (treat empty string as "All")
    const cat = (this.selectedCategory || '').toString();
    if (cat) {
      working = working.filter(s => (s.category ?? '').includes(cat));
    }

    // General text search (match against name and location ONLY; QTH has its own filters)
    const term = (this.searchTerm || '').toString().trim().toLowerCase();
    if (term) {
      working = working.filter((s: Site) => {
        const nameVal = ((s as any)?.name ?? '').toString();
        const locationVal = (s.location ?? '').toString();
        const haystack = `${nameVal} ${locationVal}`.toLowerCase();
        return haystack.includes(term);
      });
    }

    // QTH dropdown filter: exact case-insensitive match
    const qthSel = (this.selectedQth || '').toString().trim().toLowerCase();
    if (qthSel) {
      working = working.filter(s => ((s.qth ?? '').toString().trim().toLowerCase()) === qthSel);
    }

    this.filteredSites = working;
    this.finishedSiteList = working;
  }
}
