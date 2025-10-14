import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from '../../env_vars';

export interface Site {
  id: number;
  category?: string;
  location?: string;
  qth?: string;
  active?: boolean;
  createdBy?: string;
  longitude?: number;
  latitude?: number;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class SiteService {
  private readonly baseUrl = environment?.apiBase + '/api/site';

  constructor(private http: HttpClient) {}

  /**
   * Fetch all sites from the API.
   * GET /api/site/all
   */
  getAllSites(): Observable<Site[]> {
    return this.http.get<Site[]>(`${this.baseUrl}/all`);
  }

  getById(id: number | string): Observable<Site> {
    return this.http.get<Site>(`${this.baseUrl}/${id}`);
  }
}
