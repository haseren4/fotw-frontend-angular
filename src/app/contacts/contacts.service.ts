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

export interface Contact {
  id: number | string;
  activationId?: number | string;
  time?: string; // ISO datetime
  callsign?: string;
  band?: string;
  mode?: string;
  rstSent?: string | number;
  rstRcvd?: string | number;
  notes?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private http = inject(HttpClient);
  private readonly contactsUrl = joinUrl(environment?.apiBase, '/api/contacts');

  getContacts(params?: Record<string, string | number | boolean>): Observable<Contact[]> {
    let httpParams = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      httpParams = httpParams.set(k, String(v));
    }
    return this.http.get<Contact[]>(this.contactsUrl, { params: httpParams, withCredentials: true });
  }
}
