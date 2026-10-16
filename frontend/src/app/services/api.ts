import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // ─── Auth ───
  register(data: { name: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, data);
  }

  verifyOTP(data: { email: string; code: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/verify`, data);
  }

  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, data);
  }

  loginVerify(data: { email: string; code: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login-verify`, data);
  }

  // ─── Profile ───
  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/profile/me`);
  }

  updateProfile(data: { name: string }): Observable<any> {
    return this.http.put(`${this.baseUrl}/profile/me`, data);
  }

  // ─── Volunteer ───
  listCategories(): Observable<any> {
    return this.http.get(`${this.baseUrl}/volunteer/categories`);
  }

  registerVolunteer(data: {
    availability: string;
    preferred_mode: string;
    bio?: string;
    category_ids: number[];
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/volunteer/register`, data);
  }

  getVolunteerProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/volunteer/me`);
  }
}