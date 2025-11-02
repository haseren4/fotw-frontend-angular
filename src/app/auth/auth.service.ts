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

type PasswordTransport = { value: string; method: 'SHA-256' | 'PLAINTEXT' };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = environment?.apiBase + '/api/users';

  constructor(private http: HttpClient) {}

  // Try to hash with Web Crypto if available; otherwise fall back to plaintext
  private async preparePassword(input: string): Promise<PasswordTransport> {
    try {
      const w = window as any;
      const subtle: SubtleCrypto | undefined = w?.crypto?.subtle || w?.msCrypto?.subtle;
      if (!subtle) {
        return { value: input, method: 'PLAINTEXT' };
      }
      const enc = new TextEncoder();
      const data = enc.encode(input);
      const hashBuffer = await subtle.digest('SHA-256', data);
      const bytes = new Uint8Array(hashBuffer);
      let hex = '';
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }
      return { value: hex, method: 'SHA-256' };
    } catch (_e) {
      // As a safety net, avoid throwing and send plaintext if hashing is not supported.
      return { value: input, method: 'PLAINTEXT' };
    }
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return from(this.preparePassword(payload.password)).pipe(
      switchMap((pw) => {
        const body = { ...payload, password: pw.value };
        const headers = new HttpHeaders({
          'X-Password-Hashed': pw.method,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        });
        return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, body, { headers });
      })
    );
  }

  // Login and allow cookies from server (e.g., Set-Cookie: callsign=...)
  login(payload: LoginRequest): Observable<LoginResult> {
    return from(this.preparePassword(payload.password)).pipe(
      switchMap((pw) => {
        const body = { callsign: payload.callsign, password: pw.value };
        const headers = new HttpHeaders({
          'X-Password-Hashed': pw.method,
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
