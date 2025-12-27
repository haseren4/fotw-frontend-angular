import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MotdService } from '../motd/motd.service';
import { Observable, of } from 'rxjs';
import { DashboardService } from './dashboard.service';
import { ActivationsService } from '../activations/activations.service';
import { Site, SiteService } from '../site-service/site-service';
import { UnderscoreToSpacePipe } from '../shared/underscore-to-space.pipe';
import { StatusIconPipe } from '../shared/status-icon.pipe';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LocationMap } from '../location-map/location-map';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, UnderscoreToSpacePipe, StatusIconPipe, LocationMap],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  callsign: string | null = null;
  greeting: string | null = null;
  motd$!: Observable<string>;

  currentActivation: any | null = null;
  currentSite: Site | null = null;

  // Sites list for dropdown selection
  sitesList: Site[] = [];

  // Create Activation form state
  activationForm!: FormGroup;
  creating = false;
  createSuccess: string | null = null;
  createError: string | null = null;

  // End Activation state
  ending = false;
  endSuccess: string | null = null;
  endError: string | null = null;

  // End Activation Modal state (mirror Activations list behavior)
  showEndModal = false;
  selectedAdifFile: File | null = null;
  submitting = false;
  submitError: string | null = null;

  // Import Past Activation (from ADIF) modal state
  showImportModal = false;
  importSelectedFile: File | null = null;
  importSiteId: string | number | '' = '';
  importSubmitting = false;
  importError: string | null = null;
  importSuccess: string | null = null;

  // Self Spot form state
  spotForm!: FormGroup;
  spotSubmitting = false;
  spotSuccess: string | null = null;
  spotError: string | null = null;

  constructor(
    private motd: MotdService,
    private dashboardSvc: DashboardService,
    private fb: FormBuilder,
    private activations: ActivationsService,
    private sites: SiteService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {}

  // Build an OpenStreetMap embed URL (iframe) with a marker pin and mark it safe for resource URL context
  buildOsmEmbedUrlSafe(lat?: number, lon?: number, zoom = 14): SafeResourceUrl | null {
    if (lat === undefined || lat === null || lon === undefined || lon === null) return null;
    const delta = 0.03; // ~few km box around the marker
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
    const cookieCallsign = this.readCallsignFromCookies();
    this.callsign = cookieCallsign;

    // Init activation form
    this.activationForm = this.fb.group({
      description: ['', [Validators.maxLength(2000)]],
      siteId: ['', []],
      status: ['scheduled', []],
      callsign: [cookieCallsign ?? '', []]
    });

    // Init self-spot form
    this.spotForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(2000)]],
      createdAtNow: [true, []]
    });

    if (cookieCallsign) {
      this.dashboardSvc.getDashboardGreeting(cookieCallsign).subscribe({
        next: (dto) => {
          try {
            const cs = (dto?.callsign ?? cookieCallsign ?? '').toString();
            this.callsign = cs ? cs.toUpperCase() : this.callsign;
            this.activationForm.patchValue({ callsign: this.callsign ?? '' });
            this.greeting = (dto as any)?.greeting ?? null;
            const motd = (dto as any)?.motd;
            if (typeof motd === 'string' && motd.trim().length > 0) {
              this.motd$ = of(motd);
            } else {
              this.motd$ = this.motd.getMotd();
            }
          } catch {
            this.motd$ = this.motd.getMotd();
          }
        },
        error: () => {
          this.motd$ = this.motd.getMotd();
        }
      });

      // Also check if there is a current activation for this callsign
      this.activations.getCurrentActivation(cookieCallsign).subscribe({
        next: (a) => {
          this.currentActivation = a || null;
          // Prefer embedded site object from the API response if present
          const embeddedSite = (a as any)?.site;
          if (embeddedSite) {
            this.currentSite = embeddedSite;
            return;
          }
          this.currentSite = null;
          // Otherwise, try to resolve a site id from various possible fields
          const siteId = (a as any)?.site?.id ?? (a as any)?.siteId ?? (a as any)?.site_id;
          if (siteId !== undefined && siteId !== null && String(siteId).trim() !== '') {
            this.sites.getById(siteId).subscribe({
              next: (site) => { this.currentSite = site; },
              error: () => { this.currentSite = null; }
            });
          }
        },
        error: () => {
          this.currentActivation = null;
          this.currentSite = null;
        }
      });
    } else {
      this.motd$ = this.motd.getMotd();
    }

    // Load sites list for the Site ID dropdown (only active sites)
    this.sites.getAllSites().subscribe({
      next: (sites) => {
        const list = Array.isArray(sites) ? sites : [];
        this.sitesList = list.filter(s => s && s.active === true);
      },
      error: () => { this.sitesList = []; }
    });
  }

  submitActivation(): void {
    console.log("Submitting activation...");
    this.createSuccess = null;
    this.createError = null;

    if (this.activationForm.invalid) {
      console.log("Activation form invalid");
      console.log(this.activationForm.invalid);
      Object.entries(this.activationForm.controls).forEach(([name, c]) => {
        if (c.invalid) console.log(name, c.errors, 'value=', c.value);
      });
      this.activationForm.markAllAsTouched();
      return;
    }

    const raw = this.activationForm.value;
    console.log(raw);
    const payload: any = {
      description: (raw.description ?? '').toString().trim() || undefined,
      status: (raw.status ?? 'scheduled').toString(),
      callsign: (raw.callsign ?? this.callsign ?? '').toString().trim(),
      currentDate: new Date().toISOString()
    };
    console.log(payload);
    if (raw.siteId !== null && raw.siteId !== undefined && String(raw.siteId).trim() !== '') {
      payload.siteId = String(raw.siteId).trim();
      payload.siteId = String(raw.siteId).split(" ").pop();
      console.log(payload.siteId);
    }

    this.creating = true;
    console.log(payload);
    this.activations.createActivation(payload).subscribe({
      next: (created) => {
        this.createSuccess = `Activation created with id ${created?.id ?? ''}`.trim();
        console.log(this.createSuccess);
        this.creating = false;
        // Reload the page to reflect new activation state per requirement
        if (typeof window !== 'undefined' && window?.location) {
          window.location.reload();
          console.log("Reloading dashboard")
          return;
        }
        // Fallback: reset form but keep callsign and default status
        const keepCallsign = payload.callsign;
        this.activationForm.reset({  description: '', siteId: '', status: 'scheduled', callsign: keepCallsign });
      },
      error: (err) => {
        console.error('Failed to create activation', err);
        this.createError = err?.error?.message || 'Failed to create activation.';
        this.creating = false;
      }
    });
  }

  endCurrentActivation(): void {
    this.endSuccess = null;
    this.endError = null;
    if (!this.currentActivation || !this.currentActivation.id) {
      this.endError = 'No active activation to end.';
      return;
    }
    const proceed = confirm('End the current activation now?');
    if (!proceed) return;

    const id = this.currentActivation.id;
    this.ending = true;
    this.activations.updateActivation(id, { endedAt: new Date().toISOString() }).subscribe({
      next: () => {
        this.endSuccess = 'Activation ended.';
        // Refresh current activation for this callsign
        if (this.callsign) {
          this.activations.getCurrentActivation(this.callsign).subscribe({
            next: (a) => {
              this.currentActivation = a || null;
              const embeddedSite = (a as any)?.site;
              if (embeddedSite) {
                this.currentSite = embeddedSite;
              } else {
                this.currentSite = null;
                const siteId = (a as any)?.site?.id ?? (a as any)?.siteId ?? (a as any)?.site_id;
                if (siteId !== undefined && siteId !== null && String(siteId).trim() !== '') {
                  this.sites.getById(siteId).subscribe({
                    next: (site) => { this.currentSite = site; },
                    error: () => { this.currentSite = null; }
                  });
                }
              }
            },
            error: () => {
              this.currentActivation = null;
              this.currentSite = null;
            }
          });
        } else {
          this.currentActivation = null;
          this.currentSite = null;
        }
        this.ending = false;
      },
      error: (err) => {
        console.error('Failed to end activation', err);
        this.endError = err?.error?.message || 'Failed to end activation.';
        this.ending = false;
      }
    });
  }

  // Open the end-activation modal
  openEndModal(): void {
    if (!this.currentActivation || !this.currentActivation.id) {
      this.endError = 'No active activation to end.';
      return;
    }
    this.selectedAdifFile = null;
    this.submitError = null;
    this.showEndModal = true;
  }

  // Close the modal if not submitting
  closeEndModal(): void {
    if (this.submitting) return;
    this.showEndModal = false;
    this.selectedAdifFile = null;
    this.submitError = null;
  }

  // File input change handler
  onAdifFileChange(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input?.files && input.files.length > 0 ? input.files[0] : null;
    this.selectedAdifFile = file;
  }

  // Submit: optional ADIF upload, then end activation, then navigate and force reload
  async submitEndActivation(): Promise<void> {
    if (!this.currentActivation || !this.currentActivation.id || this.submitting) return;
    this.submitting = true;
    this.submitError = null;
    const id = this.currentActivation.id;
    try {
      if (this.selectedAdifFile) {
        await this.activations.uploadAdif(id, this.selectedAdifFile).toPromise();
      }
      await this.activations.endActivation(id).toPromise();
      await this.router.navigate(['/dashboard']);
      window.location.reload();
    } catch (e: any) {
      console.error('Failed to end activation', e);
      this.submitError = e?.error?.message || 'Failed to end activation. Please try again.';
    } finally {
      this.submitting = false;
      this.showEndModal = false;
    }
  }

  // Import Past Activation (ADIF) UI actions
  openImportModal(): void {
    this.importSelectedFile = null;
    this.importSiteId = '';
    this.importError = null;
    this.importSuccess = null;
    this.showImportModal = true;
  }

  closeImportModal(): void {
    if (this.importSubmitting) return;
    this.showImportModal = false;
    this.importSelectedFile = null;
    this.importSiteId = '';
    this.importError = null;
    this.importSuccess = null;
  }

  onImportFileChange(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input?.files && input.files.length > 0 ? input.files[0] : null;
    this.importSelectedFile = file;
  }

  async submitImportFromAdif(): Promise<void> {
    if (this.importSubmitting) return;
    this.importError = null;
    this.importSuccess = null;
    const siteId = this.importSiteId;
    const file = this.importSelectedFile;
    if (!siteId || String(siteId).trim() === '') {
      this.importError = 'Please select a site.';
      return;
    }
    if (!file) {
      this.importError = 'Please choose an ADIF file to upload.';
      return;
    }
    this.importSubmitting = true;
    try {
      const created = await this.activations.createActivationFromAdif(siteId, file, this.callsign ?? undefined).toPromise();
      this.importSuccess = `Imported activation #${created?.id ?? ''}`.trim();
      // After import, navigate to activation details if possible, then reload dashboard
      try {
        if (created?.id) {
          await this.router.navigate(['/activation', created.id]);
        } else {
          await this.router.navigate(['/dashboard']);
        }
      } finally {
        window.location.reload();
      }
    } catch (e: any) {
      console.error('Failed to import activation from ADIF', e);
      this.importError = e?.error?.message || 'Failed to import ADIF. Please try again.';
    } finally {
      this.importSubmitting = false;
      this.showImportModal = false;
    }
  }

  submitSelfSpot(): void {
    this.spotSuccess = null;
    this.spotError = null;

    if (!this.currentActivation || !this.currentActivation.id) {
      this.spotError = 'No active activation to post to.';
      return;
    }

    if (this.spotForm.invalid) {
      this.spotForm.markAllAsTouched();
      return;
    }

    const raw = this.spotForm.value;
    const payload: any = {
      activationId: String(this.currentActivation.id).trim(),
      content: (raw.content ?? '').toString().trim()
    };
    if (this.callsign && typeof this.callsign === 'string' && this.callsign.trim()) {
      payload.author = this.callsign.trim().toUpperCase();
    }
    if (raw.createdAtNow) {
      payload.createdAt = new Date().toISOString();
    }

    this.spotSubmitting = true;
    this.activations.createActivationPost(payload).subscribe({
      next: () => {
        this.spotSubmitting = false;
        this.spotSuccess = 'Spot posted.';
        this.spotForm.patchValue({ content: '' });
      },
      error: (err) => {
        console.error('Failed to post spot', err);
        this.spotSubmitting = false;
        this.spotError = err?.error?.message || 'Failed to post spot.';
      }
    });
  }

  private readCallsignFromCookies(): string | null {
    try {
      const cookie = document.cookie ?? '';
      if (!cookie) return null;
      const map = new Map<string, string>();
      cookie.split(';').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k) map.set(k.trim().toLowerCase(), decodeURIComponent((v ?? '').trim()));
      });
      // Prefer explicit 'callsign' cookie, otherwise fall back to any known name
      const preferred = map.get('callsign');
      if (preferred) return preferred.toUpperCase();
      const fallbacks = ['auth', 'token', 'session', 'jid', 'jsessionid'];
      for (const name of fallbacks) {
        const val = map.get(name);
        if (val) return val;
      }
      return null;
    } catch {
      return null;
    }
  }
}
