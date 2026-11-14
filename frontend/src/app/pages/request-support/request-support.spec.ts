import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequestSupport } from './request-support';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RequestSupport Component (Unit Tests)', () => {
  let component: RequestSupport;
  let fixture: ComponentFixture<RequestSupport>;
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    // Vitest mock for Router
    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RequestSupport],
      providers: [
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestSupport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Base Lifecycle Test
  it('should create the component and initialize the calendar', () => {
    expect(component).toBeTruthy();
    expect(component.calendarDays.length).toBeGreaterThan(0);
    expect(component.currentMonthName).toBe('October');
  });

  // =========================================================================
  // TC01: Negative Test Case (Missing Mandatory Fields)
  // =========================================================================
  it('TC01: should prevent submission and show an error banner when required fields are missing', () => {
    // Arrange: Leave mandatory fields empty
    component.category = '';
    component.description = '';
    component.supportMode = '';
    component.selectedDay = 1; // reset or keep empty

    // Act
    component.onSubmit();

    // Assert
    expect(component.isSubmitted).toBe(true);
    expect(component.errorMessage).toBe(
      'Please complete all required fields before searching for volunteers.',
    );
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  // =========================================================================
  // TC02: Positive Test Case (Valid Submission & Redirection)
  // =========================================================================
  it('TC02: should validate inputs and navigate to matching-results with query parameters', () => {
    // Arrange: Populate all mandatory fields with valid values
    component.category = 'Academic Support';
    component.description = 'Need help with Python loops';
    component.supportMode = 'Virtual';
    component.selectedDay = 15;
    component.selectedTime = '10:00';
    component.currentYear = 2026;
    component.currentMonth = 9; // October (0-indexed)

    // Act
    component.onSubmit();

    // Assert
    expect(component.errorMessage).toBe('');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/matching-results'], {
      queryParams: {
        category: 'Academic Support',
        description: 'Need help with Python loops',
        mode: 'Virtual',
        date: '2026-10-15',
        time: '10:00',
      },
    });
  });

  // =========================================================================
  // TC03: Boundary / Edge Test Case (Calendar Slot Overwrite Protection)
  // =========================================================================
  it('TC03: should update selectedDay when a valid day is clicked and ignore null padding slots', () => {
    // Step 1: Click a valid calendar day
    component.selectDay(22);
    expect(component.selectedDay).toBe(22);

    // Step 2: Click an empty calendar padding cell (null)
    component.selectDay(null);

    // Assert: The selection remains 22 and is not overwritten with null
    expect(component.selectedDay).toBe(22);
  });

  // =========================================================================
  // Calendar Navigation Controls
  // =========================================================================
  it('should increment month on nextMonth() and decrement on prevMonth()', () => {
    component.currentMonth = 9; // October
    component.currentYear = 2026;

    component.nextMonth();
    expect(component.currentMonth).toBe(10); // November
    expect(component.currentMonthName).toBe('November');

    component.prevMonth();
    expect(component.currentMonth).toBe(9); // Back to October
    expect(component.currentMonthName).toBe('October');
  });

  // =========================================================================
  // Back Navigation Behavior (Edit Mode vs. New Form)
  // =========================================================================
  it('should navigate to /student-requests when editRequestId is present', () => {
    component.editRequestId = 54;
    component.onGoBack();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/student-requests']);
  });

  it('should navigate to / when editRequestId is null', () => {
    component.editRequestId = null;
    component.onGoBack();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });
});
