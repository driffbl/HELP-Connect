import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VolunteerInbox, IncomingRequest } from './volunteer-inbox';
import { MatchingService } from '../../services/matching.service';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('VolunteerInbox Component (Unit Tests)', () => {
  let component: VolunteerInbox;
  let fixture: ComponentFixture<VolunteerInbox>;
  let matchingServiceMock: {
    getVolunteerIncoming: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
  };

  const mockIncomingData: any[] = [
    {
      Request_id: 54,
      Category_name: 'Academic Support',
      Description: 'Need help with Python programming and recursive functions',
      Student_name: 'Wei Yang',
      Preferred_date: '2026-10-15',
      Preferred_time: '12:00',
      Support_mode: 'Virtual',
      Request_status: 'Pending',
    },
    {
      Request_id: 55,
      Category_name: 'Technology Support',
      Description: 'Help configuring MySQL connection pool',
      Student_name: 'Sarah Lee',
      Preferred_date: '2026-10-16',
      Preferred_time: '14:30',
      Support_mode: 'Face-to-Face',
      Request_status: 'Pending',
    },
  ];

  beforeEach(async () => {
    matchingServiceMock = {
      getVolunteerIncoming: vi.fn().mockReturnValue(of(mockIncomingData)),
      updateStatus: vi.fn().mockReturnValue(of(true)),
    };

    vi.spyOn(window, 'alert').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [VolunteerInbox],
      providers: [
        provideRouter([]),
        { provide: MatchingService, useValue: matchingServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            params: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VolunteerInbox);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component and fetch incoming requests on init', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(matchingServiceMock.getVolunteerIncoming).toHaveBeenCalledWith(component.volunteerId);
    expect(component.pendingRequests.length).toBe(2);
    expect(component.pendingRequests[0].request_id).toBe(54);
    expect(component.isLoading).toBe(false);
  });

  it('should display empty list when no requests exist', () => {
    matchingServiceMock.getVolunteerIncoming.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(component.pendingRequests.length).toBe(0);
    expect(component.isLoading).toBe(false);
  });

  // =========================================================================
  // TC06: Positive (Accept Request)
  // =========================================================================
  it('TC06: should call updateStatus with Accepted and remove the request from the inbox queue', () => {
    fixture.detectChanges();
    const targetRequest: IncomingRequest = component.pendingRequests[0];

    component.onAcceptRequest(targetRequest);

    expect(matchingServiceMock.updateStatus).toHaveBeenCalledWith(54, 'Accepted');
    expect(window.alert).toHaveBeenCalledWith(
      'Request #54 accepted! The student has been notified.',
    );
    expect(component.pendingRequests.length).toBe(1);
    expect(component.pendingRequests.find((r) => r.request_id === 54)).toBeUndefined();
  });

  // =========================================================================
  // TC07: Negative / Reselection Enablement (Reject Request)
  // =========================================================================
  it('TC07: should call updateStatus with Rejected and remove the request from the active inbox', () => {
    fixture.detectChanges();
    const targetRequest: IncomingRequest = component.pendingRequests[0];

    component.onRejectRequest(targetRequest);

    expect(matchingServiceMock.updateStatus).toHaveBeenCalledWith(54, 'Rejected');
    expect(window.alert).toHaveBeenCalledWith(
      'Request #54 rejected. The student can now reselect another volunteer.',
    );
    expect(component.pendingRequests.length).toBe(1);
    expect(component.pendingRequests.find((r) => r.request_id === 54)).toBeUndefined();
  });

  it('should show error alert and retain requests if backend updateStatus fails', () => {
    matchingServiceMock.updateStatus.mockReturnValue(throwError(() => new Error('DB Error')));
    fixture.detectChanges();
    const targetRequest: IncomingRequest = component.pendingRequests[0];

    component.onAcceptRequest(targetRequest);

    expect(window.alert).toHaveBeenCalledWith('Failed to accept request in the database.');
    expect(component.pendingRequests.length).toBe(2);
  });

  it('formatDate should format date into DD Month YYYY', () => {
    expect(component.formatDate('2026-10-15')).toContain('15 October 2026');
    expect(component.formatDate('')).toBe('');
  });

  it('formatTime should format 24-hour time to 12-hour AM/PM', () => {
    expect(component.formatTime('14:30')).toBe('2:30 PM');
    expect(component.formatTime('09:15')).toBe('9:15 AM');
    expect(component.formatTime('')).toBe('');
  });
});
