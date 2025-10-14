import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  // Activations
  getActivations(params?: Record<string, string | number | boolean>): Observable<Activation[]> {
    let httpParams = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      httpParams = httpParams.set(k, String(v));
    }
    return this.http.get<Activation[]>(this.activationsUrl, { params: httpParams, withCredentials: true });
  }

  createActivation(payload: Partial<Activation>): Observable<Activation> {
    return this.http.post<Activation>(this.activationsUrl, payload, { withCredentials: true });
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
    return this.http.post<ActivationPost>(this.postsUrl, payload, { withCredentials: true });
  }

  // Helper: best-effort fetch of the latest post for an activation
  getLatestPostForActivation(activationId: number | string): Observable<ActivationPost[]> {
    // Use common query param conventions: limit=1, sort=desc or order=desc
    const params = new HttpParams()
      .set('activationId', String(activationId))
      .set('limit', '1')
      .set('sort', 'desc');
    return this.http.get<ActivationPost[]>(this.postsUrl, { params, withCredentials: true });
  }
}
