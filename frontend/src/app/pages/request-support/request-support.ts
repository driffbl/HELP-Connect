import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  selectedTime: string = '09:41';

  currentYear: number = 2026;
  currentMonth: number = 3;
  currentMonthName: string = 'April';
  currentDay: number = 1;
  selectedDay: number = 20;
  calendarDays: (number | null)[] = [];

  isSubmitted: boolean = false;
  errorMessage: string = '';

  constructor(private matchingService: MatchingService) {
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
    const firstDayIndex = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const totalDays = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    this.calendarDays = [];
    for (let i = 0; i < firstDayIndex; i++) {
      this.calendarDays.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      this.calendarDays.push(day);
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

    if (!this.category || !this.description.trim() || !this.supportMode || !this.selectedDay) {
      this.errorMessage =
        'Please complete all required fields (Category, Description, Schedule, Mode) before submitting.';
      return;
    }

    const formattedDate = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(this.selectedDay).padStart(2, '0')}`;

    const newRequest: SupportRequest = {
      student_id: 301,
      student_name: 'Wei Yang',
      category: this.category as any,
      description: this.description,
      preferred_date: formattedDate,
      preferred_time: this.selectedTime,
      support_mode: this.supportMode as any,
      status: 'Pending',
    };

    this.matchingService.createRequest(newRequest).subscribe({
      next: (res) => {
        alert(`Support Request #${res.request_id} created successfully!`);
      },
      error: () => {
        this.errorMessage = 'Failed to submit request. Please try again.';
      },
    });
  }
}
