import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Volunteer } from '../../app/models/volunteer.model';
import { SupportRequest } from '../../app/models/support-request.model';

@Injectable({
  providedIn: 'root',
})
export class MatchingService {
  private readonly apiUrl = 'http://localhost:5000/api/matching';

  constructor(private http: HttpClient) {}

  // Filters volunteers by category and delivery mode via Express -> MySQL (FR17 / Flow 3)
  findVolunteers(
    category: string,
    mode: string,
    date?: string,
    time?: string,
  ): Observable<Volunteer[]> {
    let params = new HttpParams().set('category', category).set('mode', mode);

    if (date) {
      params = params.set('date', date);
    }
    if (time) {
      params = params.set('time', time);
    }

    return this.http.get<any[]>(`${this.apiUrl}/volunteers`, { params }).pipe(
      map((rows) =>
        rows.map((row) => ({
          volunteer_id: row.Volunteer_id,
          user_id: row.User_id,
          user_name: row.User_name,
          avatar_url:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
          support_category: row.Category_name,
          all_categories: row.All_Categories || row.Category_name || '',
          skills_description: row.Bio || '',
          preferred_mode: row.Preferred_Support_Mode,
          availability_notes: row.Availability || '',
          is_active: true,
          rating: Number(row.Rating) || 5.0,
          completed_sessions: Number(row.Completed_sessions) || 0,
        })),
      ),
    );
  }

  // Creates and stores request with initial status 'Pending' in MySQL (FR19)
  createRequest(request: SupportRequest): Observable<{ success: boolean; request_id: number }> {
    const categoryMap: { [key: string]: number } = {
      'Academic Support': 1,
      'Technology Support': 2,
      'New Student Support': 3,
      'General Student Support': 4,
    };

    const payload = {
      userId: request.student_id,
      volunteerId: request.volunteer_id || null,
      categoryId: categoryMap[request.category] || 1,
      description: request.description,
      preferredDate: request.preferred_date,
      preferredTime: request.preferred_time,
      supportMode: request.support_mode,
    };

    return this.http
      .post<{ message: string; requestId: number }>(`${this.apiUrl}/requests`, payload)
      .pipe(
        map((res) => ({
          success: true,
          request_id: res.requestId,
        })),
      );
  }

  // Updates request status (Accepted / Rejected) in MySQL (FR22 / FR23)
  updateStatus(requestId: number, status: 'Accepted' | 'Rejected'): Observable<boolean> {
    return this.http
      .patch<{ message: string }>(`${this.apiUrl}/requests/${requestId}/status`, { status })
      .pipe(map(() => true));
  }

  // Fetches student requests from MySQL for tracking dashboard (FR34 / Flow 7)
  getStudentRequests(studentId: number): Observable<SupportRequest[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests/student/${studentId}`).pipe(
      map((rows) =>
        rows.map((row) => ({
          request_id: row.Request_id,
          student_id: row.User_id,
          student_name: row.Student_name || 'Me',
          volunteer_id: row.Volunteer_id,
          volunteer_name: row.Volunteer_name || 'Unassigned',
          category: row.Category_name,
          description: row.Description,
          preferred_date: row.Preferred_date,
          preferred_time: row.Preferred_time,
          support_mode: row.Support_mode,
          status: row.Request_status,
          created_at: row.created_at,
        })),
      ),
    );
  }

  // Fetches pending requests assigned to volunteer from MySQL (FR21 / Flow 5)
  getVolunteerIncoming(volunteerId: number): Observable<SupportRequest[]> {
    return this.http.get<any[]>(`${this.apiUrl}/requests/volunteer/${volunteerId}`).pipe(
      map((rows) =>
        rows.map((row) => ({
          request_id: row.Request_id,
          student_id: row.User_id,
          student_name: row.Student_name || 'Student',
          volunteer_id: row.Volunteer_id,
          volunteer_name: 'Me',
          category: row.Category_name,
          description: row.Description,
          preferred_date: row.Preferred_date,
          preferred_time: row.Preferred_time,
          support_mode: row.Support_mode,
          status: row.Request_status,
          created_at: row.created_at,
        })),
      ),
    );
  }
}
