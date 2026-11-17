import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatchingResults } from './matching-results';
import { MatchingService } from '../../services/matching.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Volunteer } from '../../models/volunteer.model';

describe('MatchingResults Component (Unit Tests)', () => {
  let component: MatchingResults;
  let fixture: ComponentFixture<MatchingResults>;
  let matchingServiceMock: {
    findVolunteers: ReturnType<typeof vi.fn>;
    assignVolunteer: ReturnType<typeof vi.fn>;
    createRequest: ReturnType<typeof vi.fn>;
  };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  // Fully compliant mock volunteers satisfying the Volunteer interface
  const mockVolunteers: Volunteer[] = [
    {
      volunteer_id: 13,
      user_id: 26,
      user_name: 'Alex Tan',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      categories: ['Academic Support'],
      support_category: 'Academic Support',
      skills_description: 'Python, Math, Calculus tutoring',
      preferred_mode: 'Both',
      availability_notes: 'Monday, Wednesday and Thursday (10am to 12pm)',
      all_categories: 'Academic Support',
      is_active: true,
      rating: 4.8,
      review_count: 12,
      completed_sessions: 24,
    },
    {
      volunteer_id: 23,
      user_id: 27,
      user_name: 'Lee',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
      categories: ['Academic Support'],
      support_category: 'Academic Support',
      skills_description: 'Algorithms and Data Structures',
      preferred_mode: 'Both',
      availability_notes: 'Mon/Tue 9:00-13:00',
      all_categories: 'Academic Support',
      is_active: true,
      rating: 5.0,
      review_count: 3,
      completed_sessions: 8,
    },
  ];

  beforeEach(async () => {
    matchingServiceMock = {
      findVolunteers: vi.fn().mockReturnValue(of(mockVolunteers)),
      assignVolunteer: vi.fn().mockReturnValue(of({ success: true })),
      createRequest: vi.fn().mockReturnValue(of({ success: true, request_id: 101 })),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MatchingResults],
      providers: [
        { provide: MatchingService, useValue: matchingServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({
              category: 'Academic Support',
              description: 'Need help with math',
              mode: 'Both',
              date: '2026-10-12',
              time: '11:00',
            }),
          },
        },
      ],
    }).compileComponents();

    // Mock localStorage session
    const store: Record<string, string> = {
      user: JSON.stringify({ User_id: 1, User_name: 'Wei Yang' }),
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] || null);

    fixture = TestBed.createComponent(MatchingResults);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Base Lifecycle Test
  it('should create and populate search parameters from query params', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.searchCategory).toBe('Academic Support');
    expect(component.searchMode).toBe('Both');
    expect(component.searchDate).toBe('2026-10-12');
  });

  // =========================================================================
  // TC04: Positive Test Case (Volunteer Cards Populated)
  // =========================================================================
  it('TC04: should populate volunteer cards upon receiving valid search criteria', () => {
    fixture.detectChanges();

    expect(matchingServiceMock.findVolunteers).toHaveBeenCalledWith(
      'Academic Support',
      'Both',
      '2026-10-12',
      '11:00',
    );
    expect(component.rawVolunteers.length).toBe(2);
    expect(component.rawVolunteers[0].user_name).toBe('Alex Tan');
    expect(component.isLoading).toBe(false);
  });

  // =========================================================================
  // TC05: Negative / Edge Test Case (Zero Volunteers Match)
  // =========================================================================
  it('TC05: should cleanly handle empty match results without throwing runtime errors', () => {
    matchingServiceMock.findVolunteers.mockReturnValue(of([]));

    component.fetchMatchingVolunteers();

    expect(component.rawVolunteers.length).toBe(0);
    expect(component.isLoading).toBe(false);
  });

  it('should set volunteers to empty array when API throws an error', () => {
    matchingServiceMock.findVolunteers.mockReturnValue(throwError(() => new Error('Server error')));

    component.fetchMatchingVolunteers();

    expect(component.rawVolunteers).toEqual([]);
    expect(component.isLoading).toBe(false);
  });

  // =========================================================================
  // Modal Interactions & Selection Workflow
  // =========================================================================
  it('should open review modal when initiateSelection is called', () => {
    component.initiateSelection(mockVolunteers[0]);

    expect(component.selectedVolunteer).toEqual(mockVolunteers[0]);
    expect(component.showReviewModal).toBe(true);
  });

  it('should close review modal when cancelSelection is called', () => {
    component.initiateSelection(mockVolunteers[0]);
    component.cancelSelection();

    expect(component.selectedVolunteer).toBeNull();
    expect(component.showReviewModal).toBe(false);
  });

  // =========================================================================
  // Request Creation vs Re-selection Branches
  // =========================================================================
  it('should call createRequest when confirming selection for a new request (requestId is null)', () => {
    component.requestId = null;
    component.selectedVolunteer = mockVolunteers[0];
    component.searchCategory = 'Academic Support';
    component.searchDescription = 'Need help with math';
    component.searchMode = 'Both';
    component.searchDate = '2026-10-12';
    component.searchTime = '11:00';

    component.confirmSelection();

    expect(matchingServiceMock.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 1,
        volunteer_id: 13,
        status: 'Pending',
      }),
    );
    expect(component.showReviewModal).toBe(false);
    expect(component.showConfirmedModal).toBe(true);
  });

  it('should call assignVolunteer when confirming selection for an existing request (requestId present)', () => {
    component.requestId = 86;
    component.selectedVolunteer = mockVolunteers[0];

    component.confirmSelection();

    expect(matchingServiceMock.assignVolunteer).toHaveBeenCalledWith(86, 13);
    expect(component.showReviewModal).toBe(false);
    expect(component.showConfirmedModal).toBe(true);
  });

  it('should show the server message inside the dialog, not a pop-up, when a request is refused', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    matchingServiceMock.createRequest.mockReturnValue(
      throwError(() => ({ error: { message: 'You cannot request support from yourself.' } })),
    );
    component.requestId = null;
    component.selectedVolunteer = mockVolunteers[0];
    component.showReviewModal = true;

    component.confirmSelection();

    expect(component.requestError).toBe('You cannot request support from yourself.');
    expect(component.showReviewModal).toBe(true); // the dialog stays open so another volunteer can be chosen
    expect(component.showConfirmedModal).toBe(false);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('should clear the error message when the dialog is closed or another volunteer is selected', () => {
    component.requestError = 'That time slot is already booked for this volunteer.';
    component.cancelSelection();
    expect(component.requestError).toBe('');

    component.requestError = 'old error';
    component.initiateSelection(mockVolunteers[1]);
    expect(component.requestError).toBe('');
  });

  it('should go back to My Sessions when choosing another volunteer for an existing request', () => {
    component.requestId = 86;

    component.onGoBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/sessions']);
  });

  it('should go back to the request form when this is a new request', () => {
    component.requestId = null;

    component.onGoBack();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/request-support'], expect.anything());
  });

  it('should go to My Sessions after the request confirmation is closed', () => {
    component.showConfirmedModal = true;

    component.closeConfirmedModal();

    expect(component.showConfirmedModal).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/sessions']);
  });

  it('should navigate back to request form preserving criteria on onChangeCriteria', () => {
    component.searchCategory = 'Academic Support';
    component.searchDescription = 'Need help with math';
    component.searchMode = 'Both';
    component.searchDate = '2026-10-12';
    component.searchTime = '11:00';

    component.onChangeCriteria();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/request-support'], {
      queryParams: {
        category: 'Academic Support',
        description: 'Need help with math',
        mode: 'Both',
        date: '2026-10-12',
        time: '11:00',
      },
    });
  });
});
