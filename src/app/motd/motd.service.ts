import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../env_vars';

function joinUrl(base: string | undefined, path: string): string {
  const b = (base ?? '').trim();
  const p = path.trim();
  if (!b) return p;
  const left = b.replace(/\/+$/, '');
  const right = p.replace(/^\/+/, '');
  return `${left}/${right}`;
}

@Injectable({ providedIn: 'root' })
export class MotdService {
  private http = inject(HttpClient);
  private motdUrl = joinUrl(environment?.apiBase, '/api/meta/motd');

  getMotd(): Observable<string> {
    return this.http.get<{ message?: string; motd?: string; text?: string; [k: string]: any }>(this.motdUrl).pipe(
      map((res) => {
        // Accept common response shapes
        const val = res?.message ?? res?.motd ?? res?.text ?? '';
        const s = (typeof val === 'string' ? val : JSON.stringify(res ?? {})).trim();
        return s || 'Have a great day on the air!';
      }),
      catchError(() => of('Have a great day on the air!'))
    );
  }
}
