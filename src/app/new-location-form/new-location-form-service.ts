import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import {environment} from '../../env_vars';
// Adjust this import to match your project layout:


export interface LocationProposal {
  proposed_by: string;
  site_name: string;
  category: string;
  location: string;
  latitude: number;
  longitude: number;
}

export interface LocationCategory {
  value: string;
  label: string;
}

// --- URL builder: works with or without environment.apiBase ---
function joinUrl(base: string | undefined, path: string): string {
  const b = (base ?? '').trim();
  const p = path.trim();

  // If you use the Angular dev proxy, leave base empty and start with /api
  if (!b) return p; // e.g. "/api/locations/proposals"

  // Ensure no double slashes and no spaces
  const left = b.replace(/\/+$/, '');
  const right = p.replace(/^\/+/, '');
  return `${left}/${right}`;
}

@Injectable({ providedIn: 'root' })
export class NewLocationFormService {
  private http = inject(HttpClient);

  // If using proxy.conf.json -> keep apiBase '', so URLs = "/api/..."
  // If not using proxy -> set environment.apiBase = "http://localhost:8080"
  private categoriesUrl = joinUrl(environment?.apiBase, '/api/meta/location-categories');
  private submitUrl     = joinUrl(environment?.apiBase, '/api/locations/proposals');

  private jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  getCategories(): Observable<LocationCategory[]> {
    const fallback: LocationCategory[] = [
      { value: 'STAR_FORT',        label: 'Star Fort / Trace Italienne' },
      { value: 'COASTAL_BATTERY',  label: 'Coastal Battery' },
      { value: 'EARTHWORK_REDOUT', label: 'Earthwork / Redoubt' },
      { value: 'CASTLE_FORT',      label: 'Castle / Fort' },
      { value: 'POST_INSTALLATION',label: 'On-Post Historic Site' },
      { value: 'MUSEUM',           label: 'Museum / Heritage Area' },
      { value: 'OTHER',            label: 'Other' }
    ];

    // Quick sanity log (remove after verifying)
    console.log('[FOTA] categoriesUrl =', this.categoriesUrl);

    return this.http.get<LocationCategory[]>(this.categoriesUrl).pipe(
      catchError(() => of(fallback))
    );
  }

  submitProposal(model: LocationProposal): Observable<any> {
    // Quick sanity log (remove after verifying)
    console.log('[FOTA] submitUrl =', this.submitUrl);

    if (!this.submitUrl || /\s/.test(this.submitUrl)) {
      throw new Error('Invalid submitUrl (empty or contains spaces). Check environment.apiBase and proxy.');
    }

    return this.http.post(this.submitUrl, model, { headers: this.jsonHeaders });
  }
}
