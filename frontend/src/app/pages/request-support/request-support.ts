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

  currentYear: number = 2026;
  currentMonth: number = 9;
  currentMonthName: string = 'October';
  currentDay: number = 1;
  selectedDay: number = 1;
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

  selectDay(day: number | null): void {
    if (day) this.selectedDay = day;
  }

  prevMonth(): void {
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
    window.history.back();
  }

  // Phase 1: Validates and forwards search criteria without inserting into MySQL
  onSubmit(): void {
    this.isSubmitted = true;
    this.errorMessage = '';

    if (!this.category || !this.description.trim() || !this.supportMode || !this.selectedDay) {
      this.errorMessage = 'Please complete all required fields before searching for volunteers.';
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
