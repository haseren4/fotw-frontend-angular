import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, switchMap, map } from 'rxjs';
import { environment } from '../../env_vars';

export interface RegisterRequest {
  callsign: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success?: boolean;
  message?: string;
  userId?: string | number;
  [key: string]: any;
}

export interface LoginRequest {
  callsign: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment?.apiBase + '/api/users';

  constructor(private http: HttpClient) {}

  // Hash password with SHA-256 before sending over the network
  private async sha256Hex(input: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(hashBuffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return from(this.sha256Hex(payload.password)).pipe(
      switchMap((hashed) => {
        const body = { ...payload, password: hashed };
        const headers = new HttpHeaders({
          'X-Password-Hashed': 'SHA-256',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        });
        return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, body, { headers });
      })
    );
  }

  // Login and allow cookies from server (e.g., Set-Cookie: callsign=...)
  login(payload: LoginRequest): Observable<LoginResult> {
    return from(this.sha256Hex(payload.password)).pipe(
      switchMap((hashed) => {
        const body = { callsign: payload.callsign, password: hashed };
        const headers = new HttpHeaders({
          'X-Password-Hashed': 'SHA-256',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        });
        return this.http.post(`${this.baseUrl}/login`, body, {
          headers,
          withCredentials: true,
          observe: 'response'
        });
      }),
      map((resp) => {
        const ok = resp.status >= 200 && resp.status < 300;
        return { success: ok, message: ok ? 'Logged in' : 'Login failed' };
      })
    );
  }
}
