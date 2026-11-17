import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule, Header],
  templateUrl: './request-support.html',
  styleUrls: ['./request-support.css'],
})
export class RequestSupport implements OnInit {
  category: string = '';
  description: string = '';
  supportMode: string = '';
  selectedTime: string = '09:00';

  editRequestId: number | null = null;

  // The calendar opens on today's month with today selected (it used to be fixed to October 2026).
  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth();
  currentMonthName: string = '';
  currentDay: number = new Date().getDate();
  selectedDay: number = new Date().getDate();
  calendarDays: (number | null)[] = [];

  isSubmitted: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.generateCalendar();
  }

  ngOnInit(): void {
    // Restore previous inputs if navigating back from Matching Results
    this.route.queryParams.subscribe((params) => {
      if (params['category']) this.category = params['category'];
      if (params['description']) this.description = params['description'];
      if (params['mode']) this.supportMode = params['mode'];
      if (params['time']) this.selectedTime = params['time'];

      if (params['editRequestId']) {
        this.editRequestId = Number(params['editRequestId']);
      }

      if (params['date']) {
        const parsedDate = new Date(params['date'] + 'T00:00:00');
        if (!isNaN(parsedDate.getTime())) {
          this.currentYear = parsedDate.getFullYear();
          this.currentMonth = parsedDate.getMonth();
          this.selectedDay = parsedDate.getDate();
          this.generateCalendar();
        }
      }
    });
  }

  generateCalendar(): void {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.currentMonthName = monthNames[this.currentMonth];

    const firstDayOfWeek = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    this.calendarDays = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      this.calendarDays.push(null);
    }
    for (let d = 1; d <= totalDaysInMonth; d++) {
      this.calendarDays.push(d);
    }
  }

  /** True for a day in the shown month that is before today: it cannot be requested. */
  isPastDay(day: number | null): boolean {
    if (!day) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return new Date(this.currentYear, this.currentMonth, day) < startOfToday;
  }

  selectDay(day: number | null): void {
    if (day && !this.isPastDay(day)) this.selectedDay = day;
  }

  prevMonth(): void {
    // Months before the current one only hold past days, so do not go back to them.
    const today = new Date();
    if (
      this.currentYear < today.getFullYear() ||
      (this.currentYear === today.getFullYear() && this.currentMonth <= today.getMonth())
    ) {
      return;
    }
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  onGoBack(): void {
    // If the student is editing criteria for an existing request, return to their dashboard;
    // otherwise, return cleanly to the Home landing page.
    if (this.editRequestId) {
      this.router.navigate(['/student-requests']);
    } else {
      this.router.navigate(['/']);
    }
  }

  // Phase 1: Validates and forwards search criteria without inserting into MySQL
  onSubmit(): void {
    this.isSubmitted = true;
    this.errorMessage = '';

    if (!this.category || !this.description.trim() || !this.supportMode || !this.selectedDay) {
      this.errorMessage = 'Please complete all required fields before searching for volunteers.';
      return;
    }

    // The chosen day and time must still be ahead (the server checks this too).
    const [hour, minute] = (this.selectedTime || '00:00').split(':').map(Number);
    const chosen = new Date(this.currentYear, this.currentMonth, this.selectedDay, hour || 0, minute || 0);
    if (chosen <= new Date()) {
      this.errorMessage = 'The preferred date and time have already passed. Please choose a later time.';
      return;
    }

    const formattedDate = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(this.selectedDay).padStart(2, '0')}`;

    // Navigate to matching results with search criteria in query parameters
    this.router.navigate(['/matching-results'], {
      queryParams: {
        category: this.category,
        description: this.description.trim(),
        mode: this.supportMode,
        date: formattedDate,
        time: this.selectedTime,
      },
    });
  }
}
