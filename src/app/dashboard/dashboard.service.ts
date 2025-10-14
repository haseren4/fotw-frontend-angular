import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../env_vars';

export interface DashboardGreetingDTO {
  callsign: string;
  greeting: string;
  motd: string;
}

function joinUrl(base: string | undefined, path: string): string {
  const b = (base ?? '').trim();
  const p = path.trim();
  if (!b) return p;
  const left = b.replace(/\/+$/, '');
  const right = p.replace(/^\/+/, '');
  return `${left}/${right}`;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private readonly url = joinUrl(environment?.apiBase, '/api/users/dashboard');

  getDashboardGreeting(callsign: string): Observable<DashboardGreetingDTO> {
    const params = new HttpParams().set('callsign', callsign);
    return this.http.get<DashboardGreetingDTO>(this.url, {
      params,
      withCredentials: true
    });
  }
}
