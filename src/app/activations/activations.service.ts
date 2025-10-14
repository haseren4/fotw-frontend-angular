import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../env_vars';

function joinUrl(base: string | undefined, path: string): string {
  const b = (base ?? '').trim();
  const p = path.trim();
  if (!b) return p;
  const left = b.replace(/\/+$/, '');
  const right = p.replace(/^\/+/, '');
  return `${left}/${right}`;
}

export interface Activation {
  id: number | string;
  siteId?: number | string;
  title?: string;
  description?: string;
  status?: 'scheduled' | 'on_air' | 'completed' | string;
  callsign?: string;
  startedAt?: string; // ISO datetime
  endedAt?: string;   // ISO datetime
  currentDate?: string; // ISO date/time indicating client current time
  [key: string]: any;
}

export interface ActivationPost {
  id: number | string;
  activationId: number | string;
  content?: string;
  createdAt?: string; // ISO datetime
  author?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ActivationsService {
  private http = inject(HttpClient);
  private readonly activationsUrl = joinUrl(environment?.apiBase, '/api/activations');
  private readonly postsUrl = joinUrl(environment?.apiBase, '/api/activation_post');
  private readonly currentActivationUrl = joinUrl(environment?.apiBase, '/api/activations/current');

  private toSnakeCaseKey(key: string): string {
    return key
      .replace(/([A-Z])/g, '_$1')
      .replace(/__/g, '_')
      .toLowerCase();
  }

  private normalizePayload<T extends Record<string, any>>(obj: T | undefined | null, keyMap: Record<string, string> = {}): Record<string, any> {
    const out: Record<string, any> = {};
    if (!obj) return out;
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      const mappedKey = keyMap[k] ?? this.toSnakeCaseKey(k);
      out[mappedKey] = v;
    }
    return out;
  }

  // Activations
  getActivations(params?: Record<string, string | number | boolean>): Observable<Activation[]> {
    let httpParams = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      httpParams = httpParams.set(k, String(v));
    }
    return this.http.get<Activation[]>(this.activationsUrl, { params: httpParams, withCredentials: true });
  }

  // Get current activation by callsign (returns null if none)
  getCurrentActivation(callsign: string): Observable<Activation | null> {
    const params = new HttpParams().set('callsign', callsign);
    // 204 No Content will result in null body; HttpClient still calls next.
    return this.http.get<Activation | null>(this.currentActivationUrl, { params, withCredentials: true });
  }

  createActivation(payload: Partial<Activation>): Observable<Activation> {
    const body = this.normalizePayload(payload, {
      // explicit mappings if backend uses specific names
      siteId: 'site_id',
      startedAt: 'started_at',
      endedAt: 'ended_at'
    });
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });
    return this.http.post<Activation>(this.activationsUrl, body, { withCredentials: true, headers });
  }

  updateActivation(id: number | string, payload: Partial<Activation>): Observable<Activation> {
    const body = this.normalizePayload(payload, {
      siteId: 'site_id',
      startedAt: 'started_at',
      endedAt: 'ended_at'
    });
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });
    const url = `${this.activationsUrl}/${id}`;
    return this.http.patch<Activation>(url, body, { withCredentials: true, headers });
  }

  // Activation Posts
  getActivationPosts(params?: Record<string, string | number | boolean>): Observable<ActivationPost[]> {
    let httpParams = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      httpParams = httpParams.set(k, String(v));
    }
    return this.http.get<ActivationPost[]>(this.postsUrl, { params: httpParams, withCredentials: true });
  }

  createActivationPost(payload: Partial<ActivationPost>): Observable<ActivationPost> {
    const body = this.normalizePayload(payload, {
      activationId: 'activation_id',
      createdAt: 'created_at'
    });
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });
    return this.http.post<ActivationPost>(this.postsUrl, body, { withCredentials: true, headers });
  }

  // Helper: best-effort fetch of the latest post for an activation
  getLatestPostForActivation(activationId: number | string): Observable<ActivationPost[]> {
    // Use common query param conventions: limit=1, sort=desc or order=desc
    const params = new HttpParams()
      .set('activation_id', String(activationId))
      .set('limit', '1')
      .set('sort', 'desc');
    return this.http.get<ActivationPost[]>(this.postsUrl, { params, withCredentials: true });
  }
}
