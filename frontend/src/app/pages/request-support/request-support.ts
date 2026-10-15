import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatchingService } from '../../services/matching.service';
import { SupportRequest } from '../../models/support-request.model';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-support.html',
  styleUrls: ['./request-support.css'],
})
export class RequestSupport {
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
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private matchingService: MatchingService,
    private router: Router,
  ) {
    this.generateCalendar();
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

  onSubmit(): void {
    this.isSubmitted = true;
    this.errorMessage = '';

    // Validate all mandatory fields
    if (!this.category || !this.description.trim() || !this.supportMode || !this.selectedDay) {
      this.errorMessage =
        'Please complete all required fields before submitting.';
      return;
    }

    this.isLoading = true;
    const formattedDate = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(this.selectedDay).padStart(2, '0')}`;

    const newRequest: SupportRequest = {
      student_id: 1, // Logged-in student ID (matching the dummy record in MySQL)
      student_name: 'Wei Yang',
      category: this.category as any,
      description: this.description.trim(),
      preferred_date: formattedDate,
      preferred_time: this.selectedTime,
      support_mode: this.supportMode as any,
      status: 'Pending',
    };

    // Call the updated matching service to store the request in MySQL
    this.matchingService.createRequest(newRequest).subscribe({
      next: (res) => {
        this.isLoading = false;
        alert(
          `Support Request #${res.request_id} created successfully! Redirecting to available volunteers...`,
        );

        // Navigate to matching results with criteria query parameters
        this.router.navigate(['/matching-results'], {
          queryParams: {
            category: this.category,
            mode: this.supportMode,
            date: formattedDate,
            time: this.selectedTime,
          },
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('API Error:', err);
        this.errorMessage =
          'Failed to submit request to the database. Please check your backend connection.';
      },
    });
  }
}
