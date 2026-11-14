import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentRequests, StudentRequestItem } from './student-request';
import { MatchingService } from '../../services/matching.service';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('StudentRequests Component (Unit Tests)', () => {
  let component: StudentRequests;
  let fixture: ComponentFixture<StudentRequests>;
  let matchingServiceMock: { getStudentRequests: ReturnType<typeof vi.fn> };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  const mockRequests: StudentRequestItem[] = [
    {
      request_id: 86,
      category: 'Academic Support',
      description: 'Need help with advanced calculus and math proofs',
      preferred_date: '2026-11-16',
      preferred_time: '15:00',
      support_mode: 'Virtual',
      volunteer_name: 'Alex Tan',
      status: 'Pending',
      created_at: '2026-11-08T15:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    matchingServiceMock = {
      getStudentRequests: vi.fn().mockReturnValue(of(mockRequests)),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [StudentRequests],
      providers: [
        provideRouter([]),
        { provide: MatchingService, useValue: matchingServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            params: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentRequests);
    component = fixture.componentInstance;
    // Fix system clock for deterministic boundary testing (Nov 11, 2026)
    component.currentSystemDate = new Date('2026-11-11T15:00:00.000Z');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component and load student request feed on init', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(matchingServiceMock.getStudentRequests).toHaveBeenCalled();
    expect(component.requests.length).toBe(1);
    expect(component.isLoading).toBe(false);
  });

  it('should handle API errors cleanly when loading requests', () => {
    matchingServiceMock.getStudentRequests.mockReturnValue(throwError(() => new Error('DB Error')));
    fixture.detectChanges();

    expect(component.requests).toEqual([]);
    expect(component.isLoading).toBe(false);
  });

  describe('TC08: Boundary Test - Volunteer Reselection Rule', () => {
    it('TC08 (A): should allow reselection when request status is Rejected', () => {
      const rejectedReq: StudentRequestItem = {
        ...mockRequests[0],
        status: 'Rejected',
        created_at: '2026-11-11T14:00:00.000Z', // Today (immediate eligibility)
      };
      expect(component.canChangeVolunteer(rejectedReq)).toBe(true);
    });

    it('TC08 (B): should allow reselection when Pending for >= 3 days (e.g. 5 days)', () => {
      const stalePendingReq: StudentRequestItem = {
        ...mockRequests[0],
        status: 'Pending',
        created_at: '2026-11-06T15:00:00.000Z', // 5 days prior
      };
      expect(component.canChangeVolunteer(stalePendingReq)).toBe(true);
    });

    it('TC08 (C): should block reselection when Pending for < 3 days (e.g. 0-1 days)', () => {
      const recentPendingReq: StudentRequestItem = {
        ...mockRequests[0],
        status: 'Pending',
        created_at: '2026-11-11T10:00:00.000Z', // Same day
      };
      expect(component.canChangeVolunteer(recentPendingReq)).toBe(false);
    });

    it('TC08 (D): should block reselection when status is Accepted or Cancelled', () => {
      const acceptedReq: StudentRequestItem = {
        ...mockRequests[0],
        status: 'Accepted',
        created_at: '2026-11-01T10:00:00.000Z',
      };
      const cancelledReq: StudentRequestItem = {
        ...mockRequests[0],
        status: 'Cancelled',
        created_at: '2026-11-01T10:00:00.000Z',
      };

      expect(component.canChangeVolunteer(acceptedReq)).toBe(false);
      expect(component.canChangeVolunteer(cancelledReq)).toBe(false);
    });
  });

  it('should navigate to matching-results with normalized date, 24h time, and requestId', () => {
    fixture.detectChanges();
    component.onChangeVolunteer(mockRequests[0]);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/matching-results'], {
      queryParams: {
        category: 'Academic Support',
        mode: 'Virtual',
        date: '2026-11-16',
        time: '15:00',
        requestId: '86',
      },
    });
  });

  it('formatDate should format ISO string into DD/MM/YYYY', () => {
    expect(component.formatDate('2026-11-16T00:00:00.000Z')).toBe('16/11/2026');
    expect(component.formatDate('')).toBe('');
  });

  it('formatTime should format 24h string into 12h AM/PM format', () => {
    expect(component.formatTime('15:00')).toBe('3:00 PM');
    expect(component.formatTime('09:30')).toBe('9:30 AM');
    expect(component.formatTime('')).toBe('');
  });
});
