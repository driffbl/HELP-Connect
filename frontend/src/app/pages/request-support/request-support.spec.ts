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
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    expect(component.currentMonthName).toBe(monthNames[new Date().getMonth()]); // opens on the current month
    expect(component.currentDay).toBe(new Date().getDate());
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
    // A date in the next month is always in the future, whatever day the test runs.
    const future = new Date();
    future.setDate(1);
    future.setMonth(future.getMonth() + 1);
    component.currentYear = future.getFullYear();
    component.currentMonth = future.getMonth();
    component.selectedDay = 15;
    component.selectedTime = '10:00';
    const expectedDate = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-15`;

    // Act
    component.onSubmit();

    // Assert
    expect(component.errorMessage).toBe('');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/matching-results'], {
      queryParams: {
        category: 'Academic Support',
        description: 'Need help with Python loops',
        mode: 'Virtual',
        date: expectedDate,
        time: '10:00',
      },
    });
  });

  // =========================================================================
  // TC03: Boundary / Edge Test Case (Calendar Slot Overwrite Protection)
  // =========================================================================
  it('TC03: should update selectedDay when a valid day is clicked and ignore null padding slots', () => {
    // Step 1: Click a valid calendar day (in next month, so it is never in the past)
    component.nextMonth();
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
    const start = component.currentMonth;

    component.nextMonth();
    expect(component.currentMonth).toBe((start + 1) % 12);

    component.prevMonth();
    expect(component.currentMonth).toBe(start); // Back to the current month
  });

  // =========================================================================
  // Past dates cannot be requested
  // =========================================================================
  it('should not go back to a month before the current one', () => {
    const start = component.currentMonth;
    component.prevMonth();
    expect(component.currentMonth).toBe(start);
  });

  it('should treat a day before today as past, and today and later days as selectable', () => {
    const today = new Date();
    expect(component.isPastDay(null)).toBe(false);
    expect(component.isPastDay(today.getDate())).toBe(false);
    if (today.getDate() > 1) {
      expect(component.isPastDay(today.getDate() - 1)).toBe(true);
      const before = component.selectedDay;
      component.selectDay(today.getDate() - 1);
      expect(component.selectedDay).toBe(before); // a past day cannot be selected
    }
  });

  it('should refuse a date and time that have already passed and not search', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    component.category = 'Academic Support';
    component.description = 'Need help with Python loops';
    component.supportMode = 'Virtual';
    component.currentYear = yesterday.getFullYear();
    component.currentMonth = yesterday.getMonth();
    component.selectedDay = yesterday.getDate();
    component.selectedTime = '09:00';

    component.onSubmit();

    expect(component.errorMessage).toBe(
      'The preferred date and time have already passed. Please choose a later time.',
    );
    expect(routerMock.navigate).not.toHaveBeenCalled();
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
