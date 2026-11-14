import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatchingService } from './matching.service';
import { SupportRequest } from '../../app/models/support-request.model';

describe('MatchingService (Unit Tests)', () => {
  let service: MatchingService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:5000/api/matching';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MatchingService],
    });

    service = TestBed.inject(MatchingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensures no unexpected HTTP requests remain open
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // =========================================================================
  // 1. findVolunteers (Search query construction & response mapping)
  // =========================================================================
  it('findVolunteers should construct correct query params and map database fields', () => {
    const mockDbResponse = [
      {
        Volunteer_id: 13,
        User_id: 201,
        User_name: 'Alex Tan',
        Category_name: 'Academic Support',
        All_Categories: 'Academic Support, Technology Support',
        Bio: 'Data Structures and Algorithms',
        Preferred_Support_Mode: 'Both',
        Availability: 'Monday 10:00 - 12:00',
        Rating: '4.8',
        Completed_sessions: '24',
      },
    ];

    service
      .findVolunteers('Academic Support', 'Virtual', '2026-10-15', '10:00')
      .subscribe((volunteers) => {
        expect(volunteers.length).toBe(1);
        const v = volunteers[0];
        expect(v.volunteer_id).toBe(13);
        expect(v.user_name).toBe('Alex Tan');
        expect(v.support_category).toBe('Academic Support');
        expect(v.all_categories).toBe('Academic Support, Technology Support');
        expect(v.rating).toBe(4.8);
        expect(v.completed_sessions).toBe(24);
        expect(v.is_active).toBe(true);
      });

    const req = httpMock.expectOne((request) => {
      return (
        request.url === `${baseUrl}/volunteers` &&
        request.params.get('category') === 'Academic Support' &&
        request.params.get('mode') === 'Virtual' &&
        request.params.get('date') === '2026-10-15' &&
        request.params.get('time') === '10:00'
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockDbResponse);
  });

  // =========================================================================
  // 2. createRequest (POST payload translation)
  // =========================================================================
  it('createRequest should send translated categoryId and return success with request_id', () => {
    const newRequest: SupportRequest = {
      student_id: 1,
      student_name: 'Wei Yang', // <-- Added to satisfy SupportRequest interface
      volunteer_id: 13,
      category: 'Academic Support' as any,
      description: 'Need help with graph theory',
      preferred_date: '2026-10-20',
      preferred_time: '14:00',
      support_mode: 'Virtual' as any,
      status: 'Pending',
    };

    service.createRequest(newRequest).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.request_id).toBe(105);
    });

    const req = httpMock.expectOne(`${baseUrl}/requests`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      userId: 1,
      volunteerId: 13,
      categoryId: 1,
      description: 'Need help with graph theory',
      preferredDate: '2026-10-20',
      preferredTime: '14:00',
      supportMode: 'Virtual',
    });

    req.flush({ message: 'Request created', requestId: 105 });
  });

  // =========================================================================
  // 4. getStudentRequests (GET tracking feed)
  // =========================================================================
  it('getStudentRequests should format backend rows into SupportRequest array', () => {
    const mockStudentRows = [
      {
        Request_id: 70,
        User_id: 1,
        Student_name: 'Wei Yang',
        Volunteer_id: 13,
        Volunteer_name: 'Alex Tan',
        Category_name: 'Academic Support',
        Description: 'Calculus review',
        Preferred_date: '2026-10-18',
        Preferred_time: '09:00',
        Support_mode: 'Virtual',
        Request_status: 'Pending',
        created_at: '2026-10-10T08:00:00.000Z',
      },
    ];

    service.getStudentRequests(1).subscribe((list) => {
      expect(list.length).toBe(1);
      expect(list[0].request_id).toBe(70);
      expect(list[0].volunteer_name).toBe('Alex Tan');
      expect(list[0].status).toBe('Pending');
    });

    const req = httpMock.expectOne(`${baseUrl}/requests/student/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStudentRows);
  });

  // =========================================================================
  // 5. getVolunteerIncoming (GET volunteer queue)
  // =========================================================================
  it('getVolunteerIncoming should return incoming requests assigned to volunteer', () => {
    const mockInboxRows = [
      {
        Request_id: 88,
        User_id: 2,
        Student_name: 'Sarah Lee',
        Volunteer_id: 13,
        Category_name: 'Technology Support',
        Description: 'Docker configuration',
        Preferred_date: '2026-10-22',
        Preferred_time: '15:00',
        Support_mode: 'Face-to-Face',
        Request_status: 'Pending',
        created_at: '2026-10-12T10:00:00.000Z',
      },
    ];

    service.getVolunteerIncoming(13).subscribe((inbox) => {
      expect(inbox.length).toBe(1);
      expect(inbox[0].request_id).toBe(88);
      expect(inbox[0].student_name).toBe('Sarah Lee');
      expect(inbox[0].volunteer_name).toBe('Me');
    });

    const req = httpMock.expectOne(`${baseUrl}/requests/volunteer/13`);
    expect(req.request.method).toBe('GET');
    req.flush(mockInboxRows);
  });

  // =========================================================================
  // 6. assignVolunteer & reselectVolunteer
  // =========================================================================
  it('assignVolunteer should send PATCH to assign endpoint', () => {
    service.assignVolunteer(70, 25).subscribe((res) => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(`${baseUrl}/requests/70/assign`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ volunteerId: 25 });
    req.flush({ success: true });
  });
});
