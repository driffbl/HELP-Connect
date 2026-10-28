import { Injectable } from '@angular/core';
import { HttpClient, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { Observable } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const token = localStorage.getItem('token');
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(cloned);
  }
  return next(req);
};

@Injectable({
  providedIn: 'root',
})
export class Api {
  private baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // Auth
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

  // Profile
  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/profile/me`);
  }
  updateProfile(data: { name: string }): Observable<any> {
    return this.http.put(`${this.baseUrl}/profile/me`, data);
  }

  // Volunteer
  listCategories(): Observable<any> {
    return this.http.get(`${this.baseUrl}/volunteer/categories`);
  }
  listSkills(): Observable<any> {
    return this.http.get(`${this.baseUrl}/volunteer/skills`);
  }
  registerVolunteer(data: {
    availability: string;
    preferred_mode: string;
    bio?: string;
    category_ids: number[];
    skill_ids?: number[];
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/volunteer/register`, data);
  }
  getVolunteerProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/volunteer/me`);
  }
}
