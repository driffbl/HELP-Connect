import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Volunteer } from '../../app/models/volunteer.model';
import { SupportRequest } from '../../app/models/support-request.model';
import { MOCK_VOLUNTEERS, MOCK_REQUESTS } from './mock-matching.data';

@Injectable({
  providedIn: 'root',
})
export class MatchingService {
  private volunteers: Volunteer[] = [...MOCK_VOLUNTEERS];
  private requests: SupportRequest[] = [...MOCK_REQUESTS];

  // Filters volunteers by category and delivery mode (FR17 / Flow 3)
  findVolunteers(category: string, mode: string): Observable<Volunteer[]> {
    const results = this.volunteers.filter(
      (v) =>
        v.is_active &&
        v.support_category === category &&
        (v.preferred_mode === mode || v.preferred_mode === 'Both' || mode === 'Both'),
    );
    return of(results).pipe(delay(250));
  }

  // Creates and assigns request with initial status 'Pending' (FR19)
  createRequest(request: SupportRequest): Observable<{ success: boolean; request_id: number }> {
    const newId = this.requests.length + 1;
    const newRecord: SupportRequest = {
      ...request,
      request_id: newId,
      status: 'Pending',
      created_at: new Date().toISOString(),
    };
    this.requests.unshift(newRecord);
    return of({ success: true, request_id: newId }).pipe(delay(250));
  }

  // Updates request status for volunteer inbox actions (FR22 / FR23)
  updateStatus(requestId: number, status: 'Accepted' | 'Rejected'): Observable<boolean> {
    const req = this.requests.find((r) => r.request_id === requestId);
    if (req) {
      req.status = status;
      return of(true).pipe(delay(200));
    }
    return of(false);
  }

  // Fetches requests created by student for dashboard tracking (FR34 / Flow 7)
  getStudentRequests(studentId: number): Observable<SupportRequest[]> {
    const userRequests = this.requests.filter((r) => r.student_id === studentId);
    return of(userRequests).pipe(delay(200));
  }

  // Fetches pending requests assigned to a volunteer (FR21 / Flow 5)
  getVolunteerIncoming(volunteerId: number): Observable<SupportRequest[]> {
    const inbox = this.requests.filter(
      (r) => r.volunteer_id === volunteerId && r.status === 'Pending',
    );
    return of(inbox).pipe(delay(200));
  }
}
